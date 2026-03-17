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

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";
import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";
import { authorize_super_administrator_join } from "../../../authorize/authorize_super_administrator_join";
import { authorize_super_administrator_login } from "../../../authorize/authorize_super_administrator_login";
import { authorize_super_administrator_refresh } from "../../../authorize/authorize_super_administrator_refresh";
import { generate_random_shopping_mall_customer_administrator_requests_create } from "../../../generate/generate_random_shopping_mall_customer_administrator_requests_create";
import { prepare_random_shopping_mall_administrator_request } from "../../../prepare/prepare_random_shopping_mall_administrator_request";

export async function test_api_administrator_request_review_rejection_preserves_original_role(
  connection: api.IConnection,
): Promise<void> {
  const applicantEmail = typia.random<string & tags.Format<"email">>();
  const applicantPassword = typia.random<string & tags.Format<"password">>();
  const applicantHref = typia.random<string & tags.Format<"uri">>();
  const applicantReferrer = typia.random<string & tags.Format<"uri">>();
  const applicantIp = typia.random<string & tags.Format<"ipv4">>();
  const originalReason = RandomGenerator.paragraph({ sentences: 3 });
  const reviewNote = RandomGenerator.paragraph({ sentences: 4 });
  const rejectionReason = RandomGenerator.paragraph({ sentences: 2 });
  const applicantJoinConnection: api.IConnection = { host: connection.host };
  const applicantAuthorized = await authorize_customer_join(
    applicantJoinConnection,
    {
      body: {
        email: applicantEmail,
        password: applicantPassword,
        href: applicantHref,
        referrer: applicantReferrer,
        ip: applicantIp,
      } satisfies IShoppingMallCustomer.IJoin,
    },
  );
  typia.assert(applicantAuthorized);
  TestValidator.equals(
    "customer join preserves applicant email",
    applicantAuthorized.email,
    applicantEmail,
  );
  const applicantRequest =
    await generate_random_shopping_mall_customer_administrator_requests_create(
      applicantJoinConnection,
      {
        body: {
          reason: originalReason,
        } satisfies IShoppingMallAdministratorRequest.ICreate,
      },
    );
  typia.assert(applicantRequest);
  TestValidator.equals(
    "administrator request starts pending",
    applicantRequest.status,
    "pending",
  );
  TestValidator.equals(
    "administrator request keeps applicant type customer",
    applicantRequest.applicant_type,
    "customer",
  );
  TestValidator.equals(
    "administrator request stores original reason",
    applicantRequest.reason,
    originalReason,
  );
  TestValidator.equals(
    "administrator request has no review note initially",
    applicantRequest.review_note,
    null,
  );
  TestValidator.equals(
    "administrator request has no rejection reason initially",
    applicantRequest.rejection_reason,
    null,
  );
  TestValidator.equals(
    "administrator request is not reviewed initially",
    applicantRequest.reviewed_at,
    null,
  );
  TestValidator.equals(
    "administrator request is not approved initially",
    applicantRequest.approved_at,
    null,
  );
  TestValidator.equals(
    "administrator request is not rejected initially",
    applicantRequest.rejected_at,
    null,
  );
  TestValidator.equals(
    "administrator request has no reviewer initially",
    applicantRequest.reviewedByAdministrator,
    null,
  );
  const superAdministratorEmail = typia.random<string & tags.Format<"email">>();
  const superAdministratorPassword = typia.random<
    string & tags.Format<"password">
  >();
  const superAdministratorHref = typia.random<string & tags.Format<"uri">>();
  const superAdministratorReferrer = typia.random<
    string & tags.Format<"uri">
  >();
  const superAdministratorIp = typia.random<string & tags.Format<"ipv4">>();
  const superAdministratorJoinConnection: api.IConnection = {
    host: connection.host,
  };
  const superAdministratorAuthorized = await authorize_super_administrator_join(
    superAdministratorJoinConnection,
    {
      body: {
        email: superAdministratorEmail,
        password: superAdministratorPassword,
        href: superAdministratorHref,
        referrer: superAdministratorReferrer,
        ip: superAdministratorIp,
      } satisfies IShoppingMallSuperAdministrator.IJoin,
    },
  );
  typia.assert(superAdministratorAuthorized);
  TestValidator.equals(
    "super administrator join preserves reviewer email",
    superAdministratorAuthorized.email,
    superAdministratorEmail,
  );
  const applicantLoginConnection: api.IConnection = { host: connection.host };
  const applicantLoggedIn = await authorize_customer_login(
    applicantLoginConnection,
    {
      body: {
        email: applicantEmail,
        password: applicantPassword,
        href: applicantHref,
        referrer: applicantReferrer,
        ip: applicantIp,
      } satisfies IShoppingMallCustomer.ILogin,
    },
  );
  typia.assert(applicantLoggedIn);
  TestValidator.equals(
    "customer can login before review",
    applicantLoggedIn.email,
    applicantEmail,
  );
  const superAdministratorLoginConnection: api.IConnection = {
    host: connection.host,
  };
  const superAdministratorLoggedIn = await authorize_super_administrator_login(
    superAdministratorLoginConnection,
    {
      body: {
        email: superAdministratorEmail,
        password: superAdministratorPassword,
        href: superAdministratorHref,
        referrer: superAdministratorReferrer,
        ip: superAdministratorIp,
      } satisfies IShoppingMallSuperAdministrator.ILogin,
    },
  );
  typia.assert(superAdministratorLoggedIn);
  TestValidator.equals(
    "super administrator can login for review",
    superAdministratorLoggedIn.email,
    superAdministratorEmail,
  );
  const rejectionUpdate = {
    status: "rejected",
    reviewNote,
    rejectionReason,
  } satisfies IShoppingMallAdministratorRequest.IUpdate;
  const reviewedRequest =
    await api.functional.shoppingMall.administrator.administrator_requests.update(
      superAdministratorLoginConnection,
      {
        administratorRequestId: applicantRequest.id,
        body: rejectionUpdate,
      },
    );
  typia.assert(reviewedRequest);
  TestValidator.equals(
    "rejection sets rejected status",
    reviewedRequest.status,
    "rejected",
  );
  TestValidator.equals(
    "rejection preserves original reason",
    reviewedRequest.reason,
    originalReason,
  );
  TestValidator.equals(
    "rejection stores review note",
    reviewedRequest.review_note,
    reviewNote,
  );
  TestValidator.equals(
    "rejection stores rejection reason",
    reviewedRequest.rejection_reason,
    rejectionReason,
  );
  TestValidator.equals(
    "rejection clears approved at",
    reviewedRequest.approved_at,
    null,
  );
  TestValidator.equals(
    "rejection preserves request creation timestamp",
    reviewedRequest.created_at,
    applicantRequest.created_at,
  );
  TestValidator.predicate(
    "rejection sets reviewed at",
    reviewedRequest.reviewed_at !== null,
  );
  TestValidator.predicate(
    "rejection sets rejected at",
    reviewedRequest.rejected_at !== null,
  );
  TestValidator.predicate(
    "rejection records reviewing administrator",
    reviewedRequest.reviewedByAdministrator !== null,
  );
  if (reviewedRequest.reviewedByAdministrator !== null) {
    TestValidator.predicate(
      "reviewing administrator has non-empty email",
      reviewedRequest.reviewedByAdministrator.email.length > 0,
    );
    TestValidator.predicate(
      "reviewing administrator is active",
      reviewedRequest.reviewedByAdministrator.active,
    );
    TestValidator.equals(
      "reviewing administrator is not banned",
      reviewedRequest.reviewedByAdministrator.banned,
      false,
    );
  }
  const applicantPostRejectionLoginConnection: api.IConnection = {
    host: connection.host,
  };
  const applicantPostRejectionAuthorized = await authorize_customer_login(
    applicantPostRejectionLoginConnection,
    {
      body: {
        email: applicantEmail,
        password: applicantPassword,
        href: applicantHref,
        referrer: applicantReferrer,
        ip: applicantIp,
      } satisfies IShoppingMallCustomer.ILogin,
    },
  );
  typia.assert(applicantPostRejectionAuthorized);
  TestValidator.equals(
    "rejected applicant remains customer",
    applicantPostRejectionAuthorized.email,
    applicantEmail,
  );
  const administratorLoginConnection: api.IConnection = {
    host: connection.host,
  };
  await TestValidator.error(
    "rejected applicant does not gain administrator privileges",
    async () => {
      await authorize_administrator_login(administratorLoginConnection, {
        body: {
          email: applicantEmail,
          password: applicantPassword,
          href: applicantHref,
          referrer: applicantReferrer,
          ip: applicantIp,
        } satisfies IShoppingMallAdministrator.ILogin,
      });
    },
  );
}
