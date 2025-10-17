import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPortalCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPortalCommunity";
import type { ICommunityPortalMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPortalMember";
import type { ICommunityPortalPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPortalPost";

export async function test_api_post_update_nonexistent_post_not_found(
  connection: api.IConnection,
) {
  // Attempt to update a post that does not exist. The test registers a member
  // and creates a community to ensure authenticated context, then calls the
  // update endpoint with a random UUID that should not correspond to any post.

  // 1) Register a member (authenticated context)
  const memberBody = {
    username: RandomGenerator.alphaNumeric(8),
    email: typia.random<string & tags.Format<"email">>(),
    password: "P@ssw0rd123",
    display_name: RandomGenerator.name(),
  } satisfies ICommunityPortalMember.ICreate;

  const member: ICommunityPortalMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: memberBody,
    });
  typia.assert(member);

  // 2) Create a community for context
  const communityBody = {
    name: RandomGenerator.name(2),
    slug: RandomGenerator.alphaNumeric(8),
    description: RandomGenerator.paragraph({ sentences: 6 }),
    is_private: false,
    visibility: "public",
  } satisfies ICommunityPortalCommunity.ICreate;

  const community: ICommunityPortalCommunity =
    await api.functional.communityPortal.member.communities.create(connection, {
      body: communityBody,
    });
  typia.assert(community);

  // 3) Attempt to update a non-existent post
  // Note: If absolute determinism is required, replace typia.random UUID with
  // a reserved GUID like "00000000-0000-0000-0000-000000000000". We use
  // typia.random here for realistic test data.
  const fakePostId = typia.random<string & tags.Format<"uuid">>();
  const updateBody = {
    title: RandomGenerator.paragraph({ sentences: 3 }),
    body: RandomGenerator.content({ paragraphs: 1 }),
    post_type: "text" as ICommunityPortalPost.IEPostType,
  } satisfies ICommunityPortalPost.IUpdate;

  // Expect an error to be thrown when updating a non-existent post.
  // Per testing rules, do not assert specific HTTP status codes. Instead,
  // assert that the operation fails by throwing an error.
  await TestValidator.error(
    "updating non-existent post should fail",
    async () => {
      await api.functional.communityPortal.member.posts.update(connection, {
        postId: fakePostId,
        body: updateBody,
      });
    },
  );
}
