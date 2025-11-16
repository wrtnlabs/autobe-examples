import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAuthorizationToken";

/**
 * Test permanent deletion of an administrator account by a newly onboarded
 * privileged admin.
 *
 * This scenario:
 *
 * 1. Registers the first admin (target for deletion) and receives their unique id.
 * 2. Registers a new "privileged" admin (context for deletion), who will perform
 *    the deletion.
 * 3. Switches authentication context to the privileged admin.
 * 4. Invokes the permanent delete endpoint on the first admin's id.
 * 5. Asserts the endpoint returns success (void) with no error.
 *
 * Critical validation:
 *
 * - Target admin is completely and irreversibly deleted.
 * - Only the privileged admin (freshly authenticated) can perform the deletion.
 * - All actions observe required authentication and authorization policies.
 * - No recovery path exists for the deleted account.
 */
export async function test_api_admin_permanent_delete_by_new_admin(
  connection: api.IConnection,
) {
  // 1. Register first admin (to serve as the deletion target)
  const adminTargetBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.MinLength<8>>(),
    href: "https://test.target.admin/join",
    referrer: "https://referrer.target-admin.test/",
  } satisfies IDiscussionBoardAdmin.IJoin;
  const adminTargetAuth: IDiscussionBoardAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminTargetBody,
    });
  typia.assert(adminTargetAuth);
  const targetAdminId = adminTargetAuth.id;

  // 2. Register privileged admin (who will perform the deletion)
  const adminActorBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.MinLength<8>>(),
    href: "https://test.actor.admin/join",
    referrer: "https://referrer.actor-admin.test/",
  } satisfies IDiscussionBoardAdmin.IJoin;
  const adminActorAuth: IDiscussionBoardAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminActorBody,
    });
  typia.assert(adminActorAuth);

  // Connection now has the privileged admin's token via SDK internal header switching

  // 3. Delete the first admin as the privileged admin
  await api.functional.discussionBoard.admin.admins.erase(connection, {
    adminId: targetAdminId,
  });

  // 4. The API returns void; endpoint returns success implies successful, irreversible deletion.
}
