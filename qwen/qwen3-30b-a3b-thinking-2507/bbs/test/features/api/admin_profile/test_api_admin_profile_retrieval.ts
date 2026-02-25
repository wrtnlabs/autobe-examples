import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconomicPoliticalDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicPoliticalDiscussionBoardAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_admin_profile_retrieval(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin authentication
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: `${RandomGenerator.name()}@example.com`,
      href: "https://example.com",
      referrer: "https://example.com",
    } satisfies IEconomicPoliticalDiscussionBoardAdmin.IJoin,
  });
  // 2. Create a random admin to retrieve
  const newAdminEmail = `${RandomGenerator.name()}@example.com`;
  const newAdminAuth: IEconomicPoliticalDiscussionBoardAdmin.IAuthorized =
    await authorize_admin_join(adminConnection, {
      body: {
        email: newAdminEmail,
        href: "https://example.com",
        referrer: "https://example.com",
      } satisfies IEconomicPoliticalDiscussionBoardAdmin.IJoin,
    });
  typia.assert(newAdminAuth);
  // 3. Retrieve the admin profile
  const retrievedAdmin: IEconomicPoliticalDiscussionBoardAdmin =
    await api.functional.economicPoliticalDiscussionBoard.admin.admins.at(
      adminConnection,
      {
        adminId: newAdminAuth.admin.id,
      },
    );
  typia.assert(retrievedAdmin);
  // 4. Validate
  TestValidator.equals(
    "admin should have expected email",
    retrievedAdmin.email,
    newAdminEmail,
  );
  TestValidator.equals(
    "admin should be of type 'admin'",
    retrievedAdmin.role,
    "admin",
  );
  TestValidator.predicate(
    "creation timestamp should be valid",
    !!retrievedAdmin.created_at,
  );
  TestValidator.predicate(
    "update timestamp should be valid",
    !!retrievedAdmin.updated_at,
  );
}
