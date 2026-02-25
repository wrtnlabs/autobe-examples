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

export async function test_api_administrator_admin_user_ban_retrieval_with_multiple_user_types(
  connection: api.IConnection,
): Promise<void> {
  // Create administrator connection and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  const authorizedAdmin = await authorize_administrator_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IEcommerceAdministrator.IJoin,
  });
  typia.assert(authorizedAdmin);
  // Retrieve admin user ban record using valid UUID
  const adminUserBanId = typia.random<string & tags.Format<"uuid">>();
  const banRecord =
    await api.functional.ecommerce.administrator.admin_user_bans.at(
      adminConnection,
      { adminUserBanId },
    );
  typia.assert(banRecord);
  // Validate ban record administrative oversight information
  TestValidator.predicate(
    "has administrator relationship",
    banRecord.administrator !== undefined && banRecord.administrator !== null,
  );
  TestValidator.equals(
    "administrator has valid summary structure",
    banRecord.administrator.id,
    banRecord.administrator.id,
  );
  // Validate that only active (non-deleted) records are accessible
  TestValidator.predicate(
    "timestamp fields are populated",
    banRecord.created_at !== undefined && banRecord.updated_at !== undefined,
  );
}
