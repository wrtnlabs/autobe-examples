import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import type { IShoppingMallAdministratorRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministratorRequest";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";
import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";
import { generate_random_shopping_mall_customer_administrator_requests_create } from "../../../generate/generate_random_shopping_mall_customer_administrator_requests_create";
import { prepare_random_shopping_mall_administrator_request } from "../../../prepare/prepare_random_shopping_mall_administrator_request";

export async function test_api_administrator_request_review_approval_from_customer(
  connection: api.IConnection,
): Promise<void> {
  const applicantEmail = typia.random<string & tags.Format<"email">>();
  const applicantPassword = typia.random<string & tags.Format<"password">>();
  const applicantJoinConnection: api.IConnection = { host: connection.host };
  const applicantJoin = await authorize_customer_join(applicantJoinConnection, {
    body: {
      email: applicantEmail,
      password: applicantPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IShoppingMallCustomer.IJoin,
  });
  typia.assert(applicantJoin);
  const applicantLoginConnection: api.IConnection = { host: connection.host };
  const applicantLogin = await authorize_customer_login(
    applicantLoginConnection,
    {
      body: {
        email: applicantEmail,
        password: applicantPassword,
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
        ip: typia.random<string & tags.Format<"ipv4">>(),
      } satisfies IShoppingMallCustomer.ILogin,
    },
  );
  typia.assert(applicantLogin);
  const requestReason = RandomGenerator.paragraph({ sentences: 4 });
  const pendingRequest =
    await generate_random_shopping_mall_customer_administrator_requests_create(
      applicantLoginConnection,
      {
        body: {
          reason: requestReason,
        } satisfies IShoppingMallAdministratorRequest.ICreate,
      },
    );
  typia.assert(pendingRequest);
  TestValidator.equals(
    "pending request reason",
    pendingRequest.reason,
    requestReason,
  );
  TestValidator.equals(
    "pending request review note empty",
    pendingRequest.review_note,
    null,
  );
  TestValidator.equals(
    "pending request rejection reason empty",
    pendingRequest.rejection_reason,
    null,
  );
  TestValidator.equals(
    "pending request reviewed_at empty",
    pendingRequest.reviewed_at,
    null,
  );
  TestValidator.equals(
    "pending request approved_at empty",
    pendingRequest.approved_at,
    null,
  );
  TestValidator.equals(
    "pending request rejected_at empty",
    pendingRequest.rejected_at,
    null,
  );
  TestValidator.equals(
    "pending request reviewer empty",
    pendingRequest.reviewedByAdministrator,
    null,
  );
  const reviewerEmail = typia.random<string & tags.Format<"email">>();
  const reviewerPassword = typia.random<string & tags.Format<"password">>();
  const reviewerJoinConnection: api.IConnection = { host: connection.host };
  const reviewerJoin = await authorize_administrator_join(
    reviewerJoinConnection,
    {
      body: {
        email: reviewerEmail,
        password: reviewerPassword,
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
        ip: typia.random<string & tags.Format<"ipv4">>(),
      } satisfies IShoppingMallAdministrator.IJoin,
    },
  );
  typia.assert(reviewerJoin);
  const reviewerLoginConnection: api.IConnection = { host: connection.host };
  const reviewerLogin = await authorize_administrator_login(
    reviewerLoginConnection,
    {
      body: {
        email: reviewerEmail,
        password: reviewerPassword,
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
        ip: typia.random<string & tags.Format<"ipv4">>(),
      } satisfies IShoppingMallAdministrator.ILogin,
    },
  );
  typia.assert(reviewerLogin);
  const reviewNote = RandomGenerator.paragraph({ sentences: 3 });
  const approvedRequest =
    await api.functional.shoppingMall.administrator.administrator_requests.update(
      reviewerLoginConnection,
      {
        administratorRequestId: pendingRequest.id,
        body: {
          status: "approved",
          reviewNote,
          rejectionReason: null,
        } satisfies IShoppingMallAdministratorRequest.IUpdate,
      },
    );
  typia.assert(approvedRequest);
  TestValidator.equals(
    "request id preserved",
    approvedRequest.id,
    pendingRequest.id,
  );
  TestValidator.equals(
    "request applicant type preserved",
    approvedRequest.applicant_type,
    pendingRequest.applicant_type,
  );
  TestValidator.equals(
    "request reason preserved",
    approvedRequest.reason,
    requestReason,
  );
  TestValidator.equals(
    "request status approved",
    approvedRequest.status,
    "approved",
  );
  TestValidator.equals(
    "review note recorded",
    approvedRequest.review_note,
    reviewNote,
  );
  TestValidator.equals(
    "rejection reason cleared",
    approvedRequest.rejection_reason,
    null,
  );
  TestValidator.predicate(
    "reviewed_at assigned",
    approvedRequest.reviewed_at !== null,
  );
  TestValidator.predicate(
    "approved_at assigned",
    approvedRequest.approved_at !== null,
  );
  TestValidator.equals(
    "rejected_at cleared",
    approvedRequest.rejected_at,
    null,
  );
  TestValidator.predicate(
    "reviewer assigned",
    approvedRequest.reviewedByAdministrator !== null,
  );
  const reviewerSummary = typia.assert(
    approvedRequest.reviewedByAdministrator!,
  );
  TestValidator.equals(
    "reviewer id matches",
    reviewerSummary.id,
    reviewerLogin.id,
  );
  TestValidator.equals(
    "reviewer email matches",
    reviewerSummary.email,
    reviewerEmail,
  );
  TestValidator.predicate(
    "reviewer grade is supported",
    reviewerSummary.grade === "administrator" ||
      reviewerSummary.grade === "superAdministrator",
  );
  TestValidator.equals("reviewer active", reviewerSummary.active, true);
  TestValidator.equals("reviewer banned", reviewerSummary.banned, false);
  TestValidator.equals(
    "reviewer not deleted",
    reviewerSummary.deleted_at,
    null,
  );
}
