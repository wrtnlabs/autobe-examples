import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformMemberUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMemberUser";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { IECommunityPlatformPostType } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommunityPlatformPostType";
import type { IECommunityPlatformPostVisibilityState } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommunityPlatformPostVisibilityState";

/**
 * Error handling when creating a post under a non-existent community.
 *
 * Steps
 *
 * 1. Register a member user (join) to obtain an authenticated context.
 * 2. Generate a random, non-existent community UUID.
 * 3. Attempt to create a TEXT post under that community.
 * 4. Expect the API to throw an error (business not-found). Do not assert specific
 *    status codes.
 */
export async function test_api_post_create_target_community_not_found(
  connection: api.IConnection,
) {
  // 1) Authenticate a member user (join)
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    username: typia.random<
      string &
        tags.MinLength<3> &
        tags.MaxLength<20> &
        tags.Pattern<"^[A-Za-z0-9_]{3,20}$">
    >(),
    password: typia.random<
      string &
        tags.MinLength<8> &
        tags.MaxLength<64> &
        tags.Pattern<"^(?=.*[A-Za-z])(?=.*\\d)[A-Za-z\\d\\S]{8,64}$">
    >(),
    terms_accepted_at: typia.random<string & tags.Format<"date-time">>(),
    privacy_accepted_at: typia.random<string & tags.Format<"date-time">>(),
    marketing_opt_in: Math.random() < 0.5,
  } satisfies ICommunityPlatformMemberUser.ICreate;

  const authorized = await api.functional.auth.memberUser.join(connection, {
    body: joinBody,
  });
  typia.assert(authorized);

  // 2) Prepare a non-existent community id (UUID)
  const unknownCommunityId = typia.random<string & tags.Format<"uuid">>();

  // 3) Build a valid TEXT post creation body
  const postBody = {
    title: typia.random<string & tags.MinLength<1> & tags.MaxLength<300>>(),
    type: "TEXT",
    body: typia.random<string & tags.MinLength<1> & tags.MaxLength<40000>>(),
  } satisfies ICommunityPlatformPost.ICreate;

  // 4) Expect error when creating a post under the non-existent community
  await TestValidator.error(
    "creating a post in a non-existent community should be rejected",
    async () => {
      const created =
        await api.functional.communityPlatform.memberUser.communities.posts.create(
          connection,
          {
            communityId: unknownCommunityId,
            body: postBody,
          },
        );
      // If the API unexpectedly succeeds, validate type to avoid unused vars
      typia.assert<ICommunityPlatformPost>(created);
    },
  );
}
