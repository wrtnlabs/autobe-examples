import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceAdministrator";
import type { IEcommerceAdministratorPromotion } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceAdministratorPromotion";
import type { IEcommerceCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCustomer";
import type { IEcommerceSuperAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSuperAdministrator";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";

export async function test_api_administrator_promotion_retrieve_approved_request(
  connection: api.IConnection,
): Promise<void> {
  // Authenticate as administrator
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_administrator_join(adminConnection, {});
  typia.assert(adminAuth);
  // Note: This test assumes there is an approved promotion request seeded in the database
  // We need to retrieve an existing approved promotion request ID for testing
  // Since we don't have a list endpoint, we'll need to use a known approved promotion ID
  // For this test, we'll use a UUID that represents an approved promotion in the seeded data
  const approvedPromotionId = typia.random<string & tags.Format<"uuid">>();
  // Retrieve the approved promotion request
  const promotion =
    await api.functional.ecommerce.administrator.administrator_promotions.at(
      adminConnection,
      {
        administratorPromotionId: approvedPromotionId,
      },
    );
  typia.assert(promotion);
  // Validate the promotion request is approved
  TestValidator.equals(
    "status should be approved",
    promotion.status,
    "approved",
  );
  // Validate approval details
  TestValidator.predicate(
    "approval_reason should be present",
    promotion.approval_reason !== null &&
      promotion.approval_reason !== undefined,
  );
  TestValidator.predicate(
    "approved_at should be present",
    promotion.approved_at !== null && promotion.approved_at !== undefined,
  );
  TestValidator.predicate(
    "approvingSuperAdministrator should be present",
    promotion.approvingSuperAdministrator !== null,
  );
  // Validate rejection details are null
  TestValidator.equals(
    "rejected_at should be null",
    promotion.rejected_at,
    null,
  );
  // Validate requesting user information
  TestValidator.predicate(
    "requestingUser should have id",
    promotion.requestingUser.id !== undefined,
  );
  TestValidator.predicate(
    "requestingUser should have email",
    promotion.requestingUser.email !== undefined,
  );
  TestValidator.predicate(
    "requestingUser should have display_name",
    promotion.requestingUser.display_name !== undefined,
  );
  TestValidator.predicate(
    "requestingUser should have created_at",
    promotion.requestingUser.created_at !== undefined,
  );
  // Validate timestamp chronological consistency
  if (promotion.approved_at) {
    TestValidator.predicate(
      "created_at should be before approved_at",
      new Date(promotion.created_at) < new Date(promotion.approved_at),
    );
  }
  if (promotion.approved_at && promotion.updated_at) {
    TestValidator.predicate(
      "approved_at should be before or equal to updated_at",
      new Date(promotion.approved_at) <= new Date(promotion.updated_at),
    );
  }
  // Validate super administrator details
  if (promotion.approvingSuperAdministrator) {
    TestValidator.predicate(
      "approvingSuperAdministrator should have id",
      promotion.approvingSuperAdministrator.id !== undefined,
    );
    TestValidator.predicate(
      "approvingSuperAdministrator should have email",
      promotion.approvingSuperAdministrator.email !== undefined,
    );
    TestValidator.predicate(
      "approvingSuperAdministrator should have created_at",
      promotion.approvingSuperAdministrator.created_at !== undefined,
    );
  }
}
