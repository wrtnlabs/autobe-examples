import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformModerationAction } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerationAction";
import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
export async function test_api_moderation_action_retrieval_by_admin(
  connection: api.IConnection,
): Promise<void> {
  // Create admin connection and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth: ICommunityPlatformAdmin.IAuthorized =
    await authorize_admin_join(adminConnection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        href: "https://example.com/join",
        referrer: "https://example.com",
        ip: null,
      } satisfies ICommunityPlatformAdmin.IJoin,
    });
  // Create a random actionId - relying on test environment having a pre-existing moderation action
  const actionId = typia.random<string & tags.Format<"uuid">>();
  // Admin retrieves moderation action - should succeed
  const retrievedAction: ICommunityPlatformModerationAction =
    await api.functional.communityPlatform.admin.moderation.actions.at(
      adminConnection,
      { actionId },
    );
  typia.assert(retrievedAction);
  // Validate action_type is one of permitted values
  TestValidator.equals(
    "action_type is one of permitted values",
    ["warn", "mute", "suspend", "ban", "remove_content"].includes(
      retrievedAction.action_type,
    ),
    true,
  );
  // Validate reason is a non-empty string
  TestValidator.predicate(
    "reason is a non-empty string",
    typeof retrievedAction.reason === "string" &&
      retrievedAction.reason.length > 0,
  );
  // Test unauthorized access - create unauthenticated connection
  const guestConnection: api.IConnection = { host: connection.host };
  // Attempt to retrieve the same action - should fail with 401 Unauthorized
  await TestValidator.httpError(
    "unauthenticated user should get 401 Unauthorized",
    401,
    async () => {
      await api.functional.communityPlatform.admin.moderation.actions.at(
        guestConnection,
        { actionId },
      );
    },
  );
}
