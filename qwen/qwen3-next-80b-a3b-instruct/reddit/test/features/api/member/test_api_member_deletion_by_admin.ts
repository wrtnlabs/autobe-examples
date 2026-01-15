import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
export async function test_api_member_deletion_by_admin(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create a new connection and authenticate as admin
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuthResult = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      href: "https://example.com/join",
      referrer: "https://example.com",
    } satisfies ICommunityPlatformAdmin.IJoin,
  });
  typia.assert(adminAuthResult);
  // Step 2: Generate a random member ID (non-existent member)
  const memberId = typia.random<string & tags.Format<"uuid">>();
  // Step 3: Try to delete a non-existent member to validate proper error handling
  await TestValidator.error(
    "deleting non-existent member should return 404",
    async () => {
      await api.functional.communityPlatform.admin.members.erase(
        adminConnection,
        {
          memberId,
        },
      );
    },
  );
  // Step 4: Validate that an admin can delete a member that exists (impossible with provided API)
  // Since there is no way to create a member account (no member creation API endpoint provided),
  // we cannot test the successful deletion scenario. We can only test the scenario for deleting non-existent members.
  // Note: In a real system, we would create a member using a member creation endpoint first,
  // then delete it. But since no such endpoint exists in the provided API functions,
  // we must work within the system constraints.
  // Final validation: The error test above ensures the system behaves correctly when
  // attempting to delete a non-existent member, which is the only testable scenario
  // with the provided API functions.
}
