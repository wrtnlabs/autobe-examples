import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPortalComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPortalComment";
import type { ICommunityPortalCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPortalCommunity";
import type { ICommunityPortalMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPortalMember";
import type { ICommunityPortalPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPortalPost";

export async function test_api_comment_reply_nested_structure(
  connection: api.IConnection,
) {
  // 1. Register a fresh member (author who will post and comment)
  const member: ICommunityPortalMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        username: `${RandomGenerator.name(1).replace(/\s+/g, "").toLowerCase()}${Date.now().toString().slice(-4)}`,
        email: typia.random<string & tags.Format<"email">>(),
        password: "P@ssw0rd!",
        display_name: RandomGenerator.name(),
      } satisfies ICommunityPortalMember.ICreate,
    });
  typia.assert(member);

  // 2. Create a community where the post will be published
  const community: ICommunityPortalCommunity =
    await api.functional.communityPortal.member.communities.create(connection, {
      body: {
        name: RandomGenerator.name(2),
        slug: RandomGenerator.alphaNumeric(8),
        description: RandomGenerator.paragraph({ sentences: 4 }),
        is_private: false,
        visibility: "public",
      } satisfies ICommunityPortalCommunity.ICreate,
    });
  typia.assert(community);

  // 3. Create a text post in the community
  const post: ICommunityPortalPost =
    await api.functional.communityPortal.member.posts.create(connection, {
      body: {
        community_id: community.id,
        post_type: "text",
        title: RandomGenerator.paragraph({ sentences: 3 }),
        body: RandomGenerator.content({ paragraphs: 2 }),
      } satisfies ICommunityPortalPost.ICreate,
    });
  typia.assert(post);

  // 4. Create a top-level (parent) comment
  const parent: ICommunityPortalComment =
    await api.functional.communityPortal.member.posts.comments.create(
      connection,
      {
        postId: post.id,
        body: {
          post_id: post.id,
          parent_comment_id: null,
          body: RandomGenerator.paragraph({ sentences: 5 }),
        } satisfies ICommunityPortalComment.ICreate,
      },
    );
  typia.assert(parent);

  // 5. Create a reply (child comment) referencing the parent comment id
  const reply: ICommunityPortalComment =
    await api.functional.communityPortal.member.posts.comments.create(
      connection,
      {
        postId: post.id,
        body: {
          post_id: post.id,
          parent_comment_id: parent.id,
          body: RandomGenerator.paragraph({ sentences: 3 }),
        } satisfies ICommunityPortalComment.ICreate,
      },
    );
  typia.assert(reply);

  // 6. Validations
  // Validate that the reply's parent_comment_id equals the parent comment id
  TestValidator.equals(
    "reply parent_comment_id equals parent id",
    reply.parent_comment_id,
    parent.id,
  );

  // Validate that author_user_id was populated and matches the member who created them
  TestValidator.predicate(
    "parent comment has author_user_id",
    parent.author_user_id !== null && parent.author_user_id !== undefined,
  );
  TestValidator.predicate(
    "reply comment has author_user_id",
    reply.author_user_id !== null && reply.author_user_id !== undefined,
  );
  TestValidator.equals(
    "parent author matches creating member",
    parent.author_user_id,
    member.id,
  );
  TestValidator.equals(
    "reply author matches creating member",
    reply.author_user_id,
    member.id,
  );

  // Validate timestamps existence
  TestValidator.predicate(
    "parent has created_at timestamp",
    parent.created_at !== null && parent.created_at !== undefined,
  );
  TestValidator.predicate(
    "reply has created_at timestamp",
    reply.created_at !== null && reply.created_at !== undefined,
  );

  // Important note recorded in the test: the SDK does not provide a GET
  // comments/listing function in the provided materials. Therefore, this test
  // asserts nested relationship using the created comment objects (parent and
  // reply) returned by the create endpoint rather than fetching the full
  // thread via a separate GET call.
}
