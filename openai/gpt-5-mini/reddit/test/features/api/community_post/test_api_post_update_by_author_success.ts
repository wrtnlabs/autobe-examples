import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityBbsCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsCommunity";
import type { ICommunityBbsCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsCommunityMember";
import type { ICommunityBbsCommunitySettings } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsCommunitySettings";
import type { ICommunityBbsPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsPost";
import type { ICommunityBbsPostMedia } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsPostMedia";
import type { ICommunityBbsSystemAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsSystemAdmin";

export async function test_api_post_update_by_author_success(
  connection: api.IConnection,
) {
  /**
   * Successful post update by the original author.
   *
   * Steps:
   *
   * 1. Register (join) a new community member (author).
   * 2. Create a new community as the author.
   * 3. Create an initial text post in the community.
   * 4. Update the post's title and body as the same author.
   * 5. Assert that the response reflects the updated content and that updated_at
   *    advanced. Ensure publication state is preserved with respect to
   *    community.post_approval_required.
   */

  // 1) Author registration
  const authorEmail: string = typia.random<string & tags.Format<"email">>();
  const authorUsername = `testuser_${RandomGenerator.alphaNumeric(6)}`;
  const joinBody = {
    email: authorEmail,
    username: authorUsername,
    password: "Passw0rd!",
    session_context: {
      href: "http://localhost/test",
      referrer: "http://localhost/",
    },
  } satisfies ICommunityBbsCommunityMember.ICreate;

  const author: ICommunityBbsCommunityMember.IAuthorized =
    await api.functional.auth.communityMember.join(connection, {
      body: joinBody,
    });
  typia.assert(author);

  // 2) Create a unique community
  const communitySlug = `test-community-${Date.now()}`;
  const communityBody = {
    name: RandomGenerator.paragraph({ sentences: 3 }),
    slug: communitySlug,
    description: RandomGenerator.paragraph({ sentences: 6 }),
    visibility: "public",
    post_approval_required: RandomGenerator.pick([true, false]) as boolean,
  } satisfies ICommunityBbsCommunity.ICreate;

  const community: ICommunityBbsCommunity =
    await api.functional.communityBbs.communityMember.communities.create(
      connection,
      { body: communityBody },
    );
  typia.assert(community);

  // 3) Create an initial post in the community
  const createPostBody = {
    title: RandomGenerator.paragraph({ sentences: 4 }),
    body: RandomGenerator.content({ paragraphs: 2 }),
    post_type: "text",
  } satisfies ICommunityBbsPost.ICreate;

  const post: ICommunityBbsPost =
    await api.functional.communityBbs.communityMember.communities.posts.create(
      connection,
      {
        communitySlug: community.slug,
        body: createPostBody,
      },
    );
  typia.assert(post);

  // 4) Update the post as the same author
  const updatedTitle = `${post.title} (edited)`;
  const updatedBody =
    (post.body ?? "") + "\n\n" + RandomGenerator.paragraph({ sentences: 5 });
  const updateBody = {
    title: updatedTitle,
    body: updatedBody,
  } satisfies ICommunityBbsPost.IUpdate;

  const updated: ICommunityBbsPost =
    await api.functional.communityBbs.communityMember.posts.update(connection, {
      postId: post.id,
      body: updateBody,
    });
  typia.assert(updated);

  // 5) Assertions
  TestValidator.equals(
    "updated title matches request",
    updated.title,
    updateBody.title!,
  );
  TestValidator.equals(
    "updated body matches request",
    updated.body,
    updateBody.body!,
  );

  TestValidator.predicate(
    "updated_at should be more recent",
    new Date(updated.updated_at).getTime() >
      new Date(post.updated_at).getTime(),
  );

  // Ensure publication state was not implicitly changed by the author update
  TestValidator.equals(
    "publication state preserved after author edit",
    updated.is_published,
    post.is_published,
  );

  // Note: Snapshot and audit-log verification (community_bbs_post_snapshots,
  // community_bbs_audit_logs) could not be implemented because the SDK
  // materials provided do not include read endpoints or direct DB access for
  // snapshots/audit logs. Observability via the public post DTO and
  // publication-state behavior is asserted above instead.
}
