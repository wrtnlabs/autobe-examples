import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceAdministrator";
import type { IEcommerceMetadataRegistryRelationshipOfVariantConfig } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMetadataRegistryRelationshipOfVariantConfig";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";

export async function test_api_administrator_admin_user_ban_retrieval_with_administrator_ban_targets(
  connection: api.IConnection,
): Promise<void> {
  // Create administrator connection and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  const authorizedAdmin = await authorize_administrator_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "test_password_123",
    } satisfies IEcommerceAdministrator.IJoin,
  });
  typia.assert(authorizedAdmin);
  // Retrieve an existing admin user ban record
  const banId = typia.random<string & tags.Format<"uuid">>();
  const banRecord =
    await api.functional.ecommerce.administrator.admin_user_bans.at(
      adminConnection,
      { adminUserBanId: banId },
    );
  typia.assert(banRecord);
  // Validate the response structure matches IEcommerceMetadataRegistryRelationshipOfVariantConfig
  TestValidator.equals("ban record has ID", typeof banRecord.id, "string");
  TestValidator.equals(
    "ban record has created_at",
    typeof banRecord.created_at,
    "string",
  );
  TestValidator.equals(
    "ban record has updated_at",
    typeof banRecord.updated_at,
    "string",
  );
  // Validate administrator summary exists
  TestValidator.equals(
    "administrator summary has ID",
    typeof banRecord.administrator.id,
    "string",
  );
  TestValidator.equals(
    "administrator summary has email",
    typeof banRecord.administrator.email,
    "string",
  );
  TestValidator.equals(
    "administrator summary has created_at",
    typeof banRecord.administrator.created_at,
    "string",
  );
  // Validate timestamps are in correct format
  TestValidator.predicate(
    "created_at is valid timestamp",
    () => !isNaN(new Date(banRecord.created_at).getTime()),
  );
  TestValidator.predicate(
    "updated_at is valid timestamp",
    () => !isNaN(new Date(banRecord.updated_at).getTime()),
  );
  TestValidator.predicate(
    "administrator created_at is valid timestamp",
    () => !isNaN(new Date(banRecord.administrator.created_at).getTime()),
  );
  // Validate UUID formats
  TestValidator.predicate("ban record ID is UUID", () =>
    /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      banRecord.id,
    ),
  );
  TestValidator.predicate("administrator ID is UUID", () =>
    /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      banRecord.administrator.id,
    ),
  );
  // Validate email format for administrator
  TestValidator.predicate("administrator email is valid", () =>
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(banRecord.administrator.email),
  );
}
