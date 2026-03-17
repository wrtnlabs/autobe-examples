import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import type { IShoppingMallAdministratorRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministratorRequest";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallSuperAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSuperAdministrator";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";
import { authorize_super_administrator_join } from "../../../authorize/authorize_super_administrator_join";
import { authorize_super_administrator_login } from "../../../authorize/authorize_super_administrator_login";
import { authorize_super_administrator_refresh } from "../../../authorize/authorize_super_administrator_refresh";
import { generate_random_shopping_mall_customer_administrator_requests_create } from "../../../generate/generate_random_shopping_mall_customer_administrator_requests_create";
import { prepare_random_shopping_mall_administrator_request } from "../../../prepare/prepare_random_shopping_mall_administrator_request";

export async function test_api_administrator_request_review_approval(
  connection: api.IConnection,
): Promise<void> {
  const customerConnection: api.IConnection = { host: connection.host };
  const customer = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IShoppingMallCustomer.IJoin,
  });
  typia.assert(customer);
  const requestReason = RandomGenerator.paragraph({ sentences: 6 });
  const createdRequest =
    await generate_random_shopping_mall_customer_administrator_requests_create(
      customerConnection,
      {
        body: {
          reason: requestReason,
        } satisfies IShoppingMallAdministratorRequest.ICreate,
      },
    );
  typia.assert(createdRequest);
  const superAdministratorConnection: api.IConnection = {
    host: connection.host,
  };
  const superAdministrator = await authorize_super_administrator_join(
    superAdministratorConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: typia.random<string & tags.Format<"password">>(),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
        ip: typia.random<string & tags.Format<"ipv4">>(),
      } satisfies IShoppingMallSuperAdministrator.IJoin,
    },
  );
  typia.assert(superAdministrator);
  const reviewNote = RandomGenerator.paragraph({ sentences: 4 });
  const approvedRequest =
    await api.functional.shoppingMall.superAdministrator.administrator_requests.update(
      superAdministratorConnection,
      {
        administratorRequestId: createdRequest.id,
        body: {
          status: "approved",
          reviewNote,
          rejectionReason: null,
        } satisfies IShoppingMallAdministratorRequest.IUpdate,
      },
    );
  typia.assert(approvedRequest);
  TestValidator.equals(
    "original reason remains unchanged after approval",
    approvedRequest.reason,
    requestReason,
  );
  TestValidator.equals(
    "applicant type remains unchanged",
    approvedRequest.applicant_type,
    createdRequest.applicant_type,
  );
  TestValidator.equals(
    "request status becomes approved",
    approvedRequest.status,
    "approved",
  );
  TestValidator.equals(
    "review note is persisted",
    approvedRequest.review_note,
    reviewNote,
  );
  TestValidator.equals(
    "rejected_at is cleared on approval",
    approvedRequest.rejected_at,
    null,
  );
  TestValidator.equals(
    "rejection reason is cleared on approval",
    approvedRequest.rejection_reason,
    null,
  );
  TestValidator.predicate(
    "reviewed_at is populated",
    approvedRequest.reviewed_at !== null,
  );
  TestValidator.predicate(
    "approved_at is populated",
    approvedRequest.approved_at !== null,
  );
  TestValidator.predicate(
    "reviewedByAdministrator is populated",
    approvedRequest.reviewedByAdministrator !== null,
  );
  const reviewer = typia.assert(approvedRequest.reviewedByAdministrator!);
  TestValidator.equals(
    "reviewer email matches acting super administrator",
    reviewer.email,
    superAdministrator.email,
  );
  TestValidator.equals(
    "approval grants regular administrator grade",
    reviewer.grade,
    "administrator",
  );
}
