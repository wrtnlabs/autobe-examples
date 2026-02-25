import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceAdministrator";
import type { IEcommerceCacheConfigurationSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCacheConfigurationSnapshot";
import type { IEcommerceSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";

export async function test_api_admin_seller_suspension_detail_retrieval(
  connection: api.IConnection,
): Promise<void> {
  // Create administrator connection
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_administrator_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IEcommerceAdministrator.IJoin,
  });
  // Retrieve suspension record
  const suspension =
    await api.functional.ecommerce.administrator.admin_seller_suspensions.at(
      adminConnection,
      {
        adminSellerSuspensionId: typia.random<string & tags.Format<"uuid">>(),
      },
    );
  typia.assert(suspension);
  // Validate required fields
  TestValidator.equals(
    "has suspension_reason",
    typeof suspension.suspension_reason,
    "string",
  );
  TestValidator.equals(
    "has suspension_start_date",
    typeof suspension.suspension_start_date,
    "string",
  );
  TestValidator.equals("has status", typeof suspension.status, "string");
  TestValidator.equals(
    "has seller information",
    typeof suspension.seller.id,
    "string",
  );
  TestValidator.equals(
    "has administrator information",
    typeof suspension.administrator.id,
    "string",
  );
  TestValidator.predicate(
    "suspension_start_date is valid date",
    () => !isNaN(new Date(suspension.suspension_start_date).getTime()),
  );
  // Validate optional fields if present
  if (
    suspension.suspension_end_date !== null &&
    suspension.suspension_end_date !== undefined
  ) {
    TestValidator.predicate(
      "suspension_end_date is valid date",
      () => !isNaN(new Date(suspension.suspension_end_date!).getTime()),
    );
  }
  if (
    suspension.reinstatement_date !== null &&
    suspension.reinstatement_date !== undefined
  ) {
    TestValidator.predicate(
      "reinstatement_date is valid date",
      () => !isNaN(new Date(suspension.reinstatement_date!).getTime()),
    );
  }
  if (
    suspension.reinstatement_reason !== null &&
    suspension.reinstatement_reason !== undefined
  ) {
    TestValidator.equals(
      "reinstatement_reason is string",
      typeof suspension.reinstatement_reason,
      "string",
    );
  }
}
