import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformFile } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformFile";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

/**
 * Test that an authenticated member receives a 404 error when attempting to delete
 * non-existent subscription preferences.
 *
 * This tests the edge case where a member tries to delete preferences that don't exist,
 * which could happen due to URL manipulation, race conditions, or stale UI state.
 */
export async function test_api_subscription_preferences_delete_nonexistent(
  connection: api.IConnection,
): Promise<void> {
  // Create a dedicated connection for the authenticated member
  const memberConnection: api.IConnection = { host: connection.host };
  // Authenticate as a member using the join operation (utility function)
  await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      username: RandomGenerator.alphaNumeric(12),
      nickname: RandomGenerator.name(1),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies ICommunityPlatformMember.IJoin,
  });
  // Generate a valid-looking but non-existent preference ID (UUID format)
  const nonExistentPreferenceId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  // Attempt to delete the non-existent subscription preferences
  // Verify that the operation returns 404 Not Found error
  await TestValidator.httpError(
    "delete non-existent preference returns 404",
    404,
    async () => {
      await api.functional.communityPlatform.member.subscription_preferences.erase(
        memberConnection,
        {
          preferenceId: nonExistentPreferenceId,
        },
      );
    },
  );
  // Note: The error response message verification is handled implicitly by TestValidator.httpError
  // which ensures the error is an HttpError with status 404.
}
