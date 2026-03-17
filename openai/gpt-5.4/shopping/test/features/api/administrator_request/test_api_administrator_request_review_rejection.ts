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

export async function test_api_administrator_request_review_rejection(
  connection: api.IConnection,
): Promise<void> {
  const customerEmail = typia.random<string & tags.Format<"email">>();
  const customerPassword = typia.random<string & tags.Format<"password">>();
  const customerJoinConnection: api.IConnection = { host: connection.host };
  const applicant = await authorize_customer_join(customerJoinConnection, {
    body: {
      email: customerEmail,
      password: customerPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IShoppingMallCustomer.IJoin,
  });
  typia.assert(applicant);
  const customerLoginConnection: api.IConnection = { host: connection.host };
  const applicantLoggedIn = await authorize_customer_login(
    customerLoginConnection,
    {
      body: {
        email: customerEmail,
        password: customerPassword,
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
        ip: typia.random<string & tags.Format<"ipv4">>(),
      } satisfies IShoppingMallCustomer.ILogin,
    },
  );
  typia.assert(applicantLoggedIn);
  TestValidator.equals(
    "customer login preserves applicant id",
    applicantLoggedIn.id,
    applicant.id,
  );
  TestValidator.equals(
    "customer login preserves applicant email",
    applicantLoggedIn.email,
    applicant.email,
  );
  const originalReason = RandomGenerator.paragraph({ sentences: 4 });
  const pendingRequest =
    await generate_random_shopping_mall_customer_administrator_requests_create(
      customerLoginConnection,
      {
        body: {
          reason: originalReason,
        } satisfies IShoppingMallAdministratorRequest.ICreate,
      },
    );
  typia.assert(pendingRequest);
  TestValidator.equals(
    "request reason preserved on creation",
    pendingRequest.reason,
    originalReason,
  );
  TestValidator.equals(
    "request starts pending",
    pendingRequest.status,
    "pending",
  );
  TestValidator.equals(
    "request applicant type is customer",
    pendingRequest.applicant_type,
    "customer",
  );
  TestValidator.equals(
    "request has no review note before review",
    pendingRequest.review_note,
    null,
  );
  TestValidator.equals(
    "request has no rejection reason before review",
    pendingRequest.rejection_reason,
    null,
  );
  TestValidator.equals(
    "request has no reviewer before review",
    pendingRequest.reviewedByAdministrator,
    null,
  );
  TestValidator.equals(
    "request has no reviewed timestamp before review",
    pendingRequest.reviewed_at,
    null,
  );
  TestValidator.equals(
    "request has no approval timestamp before review",
    pendingRequest.approved_at,
    null,
  );
  TestValidator.equals(
    "request has no rejection timestamp before review",
    pendingRequest.rejected_at,
    null,
  );
  const superAdminEmail = typia.random<string & tags.Format<"email">>();
  const superAdminPassword = typia.random<string & tags.Format<"password">>();
  const superAdminJoinConnection: api.IConnection = { host: connection.host };
  const superAdministrator = await authorize_super_administrator_join(
    superAdminJoinConnection,
    {
      body: {
        email: superAdminEmail,
        password: superAdminPassword,
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
        ip: typia.random<string & tags.Format<"ipv4">>(),
      } satisfies IShoppingMallSuperAdministrator.IJoin,
    },
  );
  typia.assert(superAdministrator);
  const superAdminLoginConnection: api.IConnection = { host: connection.host };
  const actingReviewer = await authorize_super_administrator_login(
    superAdminLoginConnection,
    {
      body: {
        email: superAdminEmail,
        password: superAdminPassword,
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
        ip: typia.random<string & tags.Format<"ipv4">>(),
      } satisfies IShoppingMallSuperAdministrator.ILogin,
    },
  );
  typia.assert(actingReviewer);
  TestValidator.equals(
    "super administrator login preserves id",
    actingReviewer.id,
    superAdministrator.id,
  );
  TestValidator.equals(
    "super administrator login preserves email",
    actingReviewer.email,
    superAdministrator.email,
  );
  const reviewNote = RandomGenerator.paragraph({ sentences: 3 });
  const rejectionReason = RandomGenerator.paragraph({ sentences: 3 });
  const rejectedRequest =
    await api.functional.shoppingMall.superAdministrator.administrator_requests.update(
      superAdminLoginConnection,
      {
        administratorRequestId: pendingRequest.id,
        body: {
          status: "rejected",
          reviewNote,
          rejectionReason,
        } satisfies IShoppingMallAdministratorRequest.IUpdate,
      },
    );
  typia.assert(rejectedRequest);
  TestValidator.equals(
    "request id unchanged after rejection",
    rejectedRequest.id,
    pendingRequest.id,
  );
  TestValidator.equals(
    "request status becomes rejected",
    rejectedRequest.status,
    "rejected",
  );
  TestValidator.equals(
    "request preserves original reason",
    rejectedRequest.reason,
    originalReason,
  );
  TestValidator.equals(
    "request stores review note",
    rejectedRequest.review_note,
    reviewNote,
  );
  TestValidator.equals(
    "request stores rejection reason",
    rejectedRequest.rejection_reason,
    rejectionReason,
  );
  TestValidator.equals(
    "request remains customer applicant type",
    rejectedRequest.applicant_type,
    pendingRequest.applicant_type,
  );
  TestValidator.equals(
    "request has no approval timestamp after rejection",
    rejectedRequest.approved_at,
    null,
  );
  TestValidator.predicate(
    "request reviewed timestamp is set",
    rejectedRequest.reviewed_at !== null,
  );
  TestValidator.predicate(
    "request rejected timestamp is set",
    rejectedRequest.rejected_at !== null,
  );
  TestValidator.predicate(
    "request reviewer is recorded",
    rejectedRequest.reviewedByAdministrator !== null,
  );
  const reviewer = typia.assert<IShoppingMallAdministrator.ISummary>(
    rejectedRequest.reviewedByAdministrator!,
  );
  TestValidator.equals(
    "reviewer id matches acting super administrator",
    reviewer.id,
    actingReviewer.id,
  );
  TestValidator.equals(
    "reviewer email matches acting super administrator",
    reviewer.email,
    actingReviewer.email,
  );
  TestValidator.equals(
    "reviewer grade is super administrator",
    reviewer.grade,
    "superAdministrator",
  );
  TestValidator.equals("reviewer is active", reviewer.active, true);
  TestValidator.equals("reviewer is not banned", reviewer.banned, false);
  const customerReloginConnection: api.IConnection = { host: connection.host };
  const applicantAfterRejection = await authorize_customer_login(
    customerReloginConnection,
    {
      body: {
        email: customerEmail,
        password: customerPassword,
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
        ip: typia.random<string & tags.Format<"ipv4">>(),
      } satisfies IShoppingMallCustomer.ILogin,
    },
  );
  typia.assert(applicantAfterRejection);
  TestValidator.equals(
    "rejected applicant remains same customer id",
    applicantAfterRejection.id,
    applicant.id,
  );
  TestValidator.equals(
    "rejected applicant remains same customer email",
    applicantAfterRejection.email,
    applicant.email,
  );
}
