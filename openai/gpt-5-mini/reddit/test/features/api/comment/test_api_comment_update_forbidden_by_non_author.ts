import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityBbsComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsComment";
import type { ICommunityBbsCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsCommunity";
import type { ICommunityBbsCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsCommunityMember";
import type { ICommunityBbsCommunitySettings } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsCommunitySettings";
import type { ICommunityBbsPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsPost";
import type { ICommunityBbsPostMedia } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsPostMedia";
import type { ICommunityBbsSystemAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsSystemAdmin";

export async function test_api_comment_update_forbidden_by_non_author(
  connection: api.IConnection,
) {
  // Strategy:
  // 1) Create two community members (author, other) each with their own connection
  // 2) Author creates a community and a post
  // 3) Author creates a comment on the post
  // 4) Other attempts to update the comment -> must fail (TestValidator.error)
  // 5) Author updates the comment successfully to confirm ownership and that
  //    the comment can be updated by the owner

  // 1) Create two accounts: author and other
  const authorConn: api.IConnection = { ...connection, headers: {} };
  const otherConn: api.IConnection = { ...connection, headers: {} };

  const authorEmail = typia.random<string & tags.Format<"email">>();
  const authorUsername = `author_${RandomGenerator.alphaNumeric(6)}`;
  const otherEmail = typia.random<string & tags.Format<"email">>();
  const otherUsername = `other_${RandomGenerator.alphaNumeric(6)}`;

  const authorAuth = await api.functional.auth.communityMember.join(
    authorConn,
    {
      body: {
        email: authorEmail,
        username: authorUsername,
        password: "Passw0rd!",
        session_context: {
          href: "http://example.test/",
          referrer: "http://example.test/ref",
          ip: null,
          session_ttl_seconds: null,
        },
      } satisfies ICommunityBbsCommunityMember.ICreate,
    },
  );
  typia.assert(authorAuth);

  const otherAuth = await api.functional.auth.communityMember.join(otherConn, {
    body: {
      email: otherEmail,
      username: otherUsername,
      password: "Passw0rd!",
      session_context: {
        href: "http://example.test/",
        referrer: "http://example.test/ref",
        ip: null,
        session_ttl_seconds: null,
      },
    } satisfies ICommunityBbsCommunityMember.ICreate,
  });
  typia.assert(otherAuth);

  // 2) Author creates a community (omit settings to avoid nullable mismatch)
  const uniqueSlug = `test-community-${Date.now()}-${RandomGenerator.alphaNumeric(4)}`;
  const community: ICommunityBbsCommunity =
    await api.functional.communityBbs.communityMember.communities.create(
      authorConn,
      {
        body: {
          name: `Test Community ${RandomGenerator.name(2)}`,
          slug: uniqueSlug,
          description: RandomGenerator.paragraph({ sentences: 6 }),
          visibility: "public",
          post_approval_required: false,
        } satisfies ICommunityBbsCommunity.ICreate,
      },
    );
  typia.assert(community);

  // 3) Author creates a post in the community
  const post: ICommunityBbsPost =
    await api.functional.communityBbs.communityMember.communities.posts.create(
      authorConn,
      {
        communitySlug: community.slug,
        body: {
          title: `Hello ${RandomGenerator.paragraph({ sentences: 3 })}`,
          body: RandomGenerator.content({ paragraphs: 2 }),
          post_type: "text",
        } satisfies ICommunityBbsPost.ICreate,
      },
    );
  typia.assert(post);

  // 4) Author creates a comment on the post
  const comment: ICommunityBbsComment =
    await api.functional.communityBbs.communityMember.posts.comments.create(
      authorConn,
      {
        postId: post.id,
        body: {
          body: "This is the original comment body.",
        } satisfies ICommunityBbsComment.ICreate,
      },
    );
  typia.assert(comment);

  // 5) Other (non-author) attempts to update the comment -> expect error
  await TestValidator.error(
    "non-author cannot update another user's comment",
    async () => {
      await api.functional.communityBbs.communityMember.comments.update(
        otherConn,
        {
          commentId: comment.id,
          body: {
            body: "Malicious edit attempt by non-author",
          } satisfies ICommunityBbsComment.IUpdate,
        },
      );
    },
  );

  // 6) Author updates the comment successfully to confirm owner privileges
  const updatedByAuthor: ICommunityBbsComment =
    await api.functional.communityBbs.communityMember.comments.update(
      authorConn,
      {
        commentId: comment.id,
        body: {
          body: "Author updated the comment after forbidden attempt.",
        } satisfies ICommunityBbsComment.IUpdate,
      },
    );
  typia.assert(updatedByAuthor);

  TestValidator.equals(
    "author successfully updated comment body",
    updatedByAuthor.body,
    "Author updated the comment after forbidden attempt.",
  );
}
