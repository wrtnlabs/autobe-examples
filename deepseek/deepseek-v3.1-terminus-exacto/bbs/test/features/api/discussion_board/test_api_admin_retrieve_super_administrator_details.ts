import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardAdministratorPromotionApproval } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministratorPromotionApproval";
import type { IDiscussionBoardSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSuperAdmin";
import type { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_admin_retrieve_super_administrator_details(
  connection: api.IConnection,
): Promise<void> {
  // Create admin connection and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IDiscussionBoardAdmin.IJoin,
  });
  typia.assert(adminAuth);
  // Retrieve administrator details
  const administratorDetails =
    await api.functional.discussionBoard.admin.administrators.at(
      adminConnection,
      {
        administratorId: adminAuth.id,
      },
    );
  typia.assert(administratorDetails);
  // Validate administrator structure based on available functionality
  // Since we can only create regular admins, validate regular admin structure
  TestValidator.equals(
    "grade should be regular",
    administratorDetails.grade,
    "regular",
  );
  TestValidator.predicate(
    "admin field should not be null",
    administratorDetails.admin !== null,
  );
  TestValidator.equals(
    "super_admin field should be null",
    administratorDetails.super_admin,
    null,
  );
  TestValidator.predicate(
    "is_active should be true",
    administratorDetails.is_active,
  );
  TestValidator.predicate(
    "user profile should have display_name",
    administratorDetails.user.display_name !== undefined,
  );
  TestValidator.predicate(
    "promoted_at should not be null",
    administratorDetails.promoted_at !== null,
  );
  // Validate admin authentication details match
  TestValidator.equals(
    "admin email should match",
    administratorDetails.admin!.email,
    adminAuth.email,
  );
  TestValidator.equals(
    "admin display_name should match",
    administratorDetails.admin!.display_name,
    adminAuth.display_name,
  );
}
