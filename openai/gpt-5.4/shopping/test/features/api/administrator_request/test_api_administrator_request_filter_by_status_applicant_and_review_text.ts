import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallAdministratorRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallAdministratorRequest";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import type { IShoppingMallAdministratorRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministratorRequest";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
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
import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { authorize_super_administrator_join } from "../../../authorize/authorize_super_administrator_join";
import { authorize_super_administrator_login } from "../../../authorize/authorize_super_administrator_login";
import { authorize_super_administrator_refresh } from "../../../authorize/authorize_super_administrator_refresh";
import { generate_random_shopping_mall_customer_administrator_requests_create } from "../../../generate/generate_random_shopping_mall_customer_administrator_requests_create";
import { prepare_random_shopping_mall_administrator_request } from "../../../prepare/prepare_random_shopping_mall_administrator_request";

export async function test_api_administrator_request_filter_by_status_applicant_and_review_text(
  connection: api.IConnection,
): Promise<void> {
  const customerApplicantConnection: api.IConnection = {
    host: connection.host,
  };
  const customerJoin = await authorize_customer_join(
    customerApplicantConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: typia.random<string & tags.Format<"password">>(),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
        ip: typia.random<string & tags.Format<"ipv4">>(),
      },
    },
  );
  typia.assert(customerJoin);
  const sellerApplicantConnection: api.IConnection = { host: connection.host };
  const sellerJoin = await authorize_seller_join(sellerApplicantConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(sellerJoin);
  const administratorConnection: api.IConnection = { host: connection.host };
  const administratorJoin = await authorize_administrator_join(
    administratorConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: typia.random<string & tags.Format<"password">>(),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      },
    },
  );
  typia.assert(administratorJoin);
  const superAdministratorConnection: api.IConnection = {
    host: connection.host,
  };
  const superAdministratorJoin = await authorize_super_administrator_join(
    superAdministratorConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: typia.random<string & tags.Format<"password">>(),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
        ip: typia.random<string & tags.Format<"ipv4">>(),
      },
    },
  );
  typia.assert(superAdministratorJoin);
  const customerApprovedReason = `customer-approved-${RandomGenerator.alphaNumeric(8)} ${RandomGenerator.paragraph({ sentences: 4 })}`;
  const customerPendingReason = `customer-pending-${RandomGenerator.alphaNumeric(8)} ${RandomGenerator.paragraph({ sentences: 4 })}`;
  const sellerRejectedReason = `seller-rejected-${RandomGenerator.alphaNumeric(8)} ${RandomGenerator.paragraph({ sentences: 4 })}`;
  const approvalReviewNote = `approval-note-${RandomGenerator.alphaNumeric(8)} ${RandomGenerator.paragraph({ sentences: 3 })}`;
  const rejectionReviewNote = `rejection-note-${RandomGenerator.alphaNumeric(8)} ${RandomGenerator.paragraph({ sentences: 3 })}`;
  const rejectionReasonText = `rejection-reason-${RandomGenerator.alphaNumeric(8)} ${RandomGenerator.paragraph({ sentences: 3 })}`;
  const approvedRequest =
    await generate_random_shopping_mall_customer_administrator_requests_create(
      customerApplicantConnection,
      {
        body: {
          reason: customerApprovedReason,
        },
      },
    );
  typia.assert(approvedRequest);
  const pendingRequest =
    await generate_random_shopping_mall_customer_administrator_requests_create(
      customerApplicantConnection,
      {
        body: {
          reason: customerPendingReason,
        },
      },
    );
  typia.assert(pendingRequest);
  const rejectedRequest =
    await generate_random_shopping_mall_customer_administrator_requests_create(
      sellerApplicantConnection,
      {
        body: {
          reason: sellerRejectedReason,
        },
      },
    );
  typia.assert(rejectedRequest);
  const approvedReviewed =
    await api.functional.shoppingMall.superAdministrator.administrator_requests.update(
      superAdministratorConnection,
      {
        administratorRequestId: approvedRequest.id,
        body: {
          status: "approved",
          reviewNote: approvalReviewNote,
          rejectionReason: null,
        } satisfies IShoppingMallAdministratorRequest.IUpdate,
      },
    );
  typia.assert(approvedReviewed);
  const rejectedReviewed =
    await api.functional.shoppingMall.superAdministrator.administrator_requests.update(
      superAdministratorConnection,
      {
        administratorRequestId: rejectedRequest.id,
        body: {
          status: "rejected",
          reviewNote: rejectionReviewNote,
          rejectionReason: rejectionReasonText,
        } satisfies IShoppingMallAdministratorRequest.IUpdate,
      },
    );
  typia.assert(rejectedReviewed);
  TestValidator.equals(
    "approved request status becomes approved",
    approvedReviewed.status,
    "approved",
  );
  TestValidator.equals(
    "rejected request status becomes rejected",
    rejectedReviewed.status,
    "rejected",
  );
  TestValidator.equals(
    "pending request remains pending after creation",
    pendingRequest.status,
    "pending",
  );
  const approvedPage =
    await api.functional.shoppingMall.customer.administrator_requests.index(
      superAdministratorConnection,
      {
        body: {
          status: "approved",
          page: 1,
          limit: 100,
        } satisfies IShoppingMallAdministratorRequest.IRequest,
      },
    );
  typia.assert(approvedPage);
  TestValidator.predicate(
    "approved filter includes approved request",
    ArrayUtil.has(approvedPage.data, (row) => row.id === approvedRequest.id),
  );
  TestValidator.predicate(
    "approved filter excludes pending request",
    approvedPage.data.every((row) => row.id !== pendingRequest.id),
  );
  TestValidator.predicate(
    "approved filter excludes rejected request",
    approvedPage.data.every((row) => row.id !== rejectedRequest.id),
  );
  TestValidator.predicate(
    "approved filter returns only approved rows with reviewer",
    approvedPage.data.every(
      (row) =>
        row.status === "approved" &&
        row.reviewedAt !== null &&
        row.reviewer !== null,
    ),
  );
  const rejectedPage =
    await api.functional.shoppingMall.customer.administrator_requests.index(
      superAdministratorConnection,
      {
        body: {
          status: "rejected",
          page: 1,
          limit: 100,
        } satisfies IShoppingMallAdministratorRequest.IRequest,
      },
    );
  typia.assert(rejectedPage);
  TestValidator.predicate(
    "rejected filter includes rejected request",
    ArrayUtil.has(rejectedPage.data, (row) => row.id === rejectedRequest.id),
  );
  TestValidator.predicate(
    "rejected filter excludes pending request",
    rejectedPage.data.every((row) => row.id !== pendingRequest.id),
  );
  TestValidator.predicate(
    "rejected filter returns only rejected rows with reviewer",
    rejectedPage.data.every(
      (row) =>
        row.status === "rejected" &&
        row.reviewedAt !== null &&
        row.reviewer !== null,
    ),
  );
  const pendingPage =
    await api.functional.shoppingMall.customer.administrator_requests.index(
      superAdministratorConnection,
      {
        body: {
          status: "pending",
          page: 1,
          limit: 100,
        } satisfies IShoppingMallAdministratorRequest.IRequest,
      },
    );
  typia.assert(pendingPage);
  TestValidator.predicate(
    "pending filter includes pending request",
    ArrayUtil.has(pendingPage.data, (row) => row.id === pendingRequest.id),
  );
  TestValidator.predicate(
    "pending rows keep reviewer null and reviewedAt null",
    pendingPage.data.every(
      (row) =>
        row.status === "pending" &&
        row.reviewer === null &&
        row.reviewedAt === null,
    ),
  );
  const customerApplicantPage =
    await api.functional.shoppingMall.customer.administrator_requests.index(
      superAdministratorConnection,
      {
        body: {
          applicantType: "customer",
          page: 1,
          limit: 100,
        } satisfies IShoppingMallAdministratorRequest.IRequest,
      },
    );
  typia.assert(customerApplicantPage);
  TestValidator.predicate(
    "customer applicant filter includes customer requests",
    ArrayUtil.has(
      customerApplicantPage.data,
      (row) => row.id === approvedRequest.id,
    ) &&
      ArrayUtil.has(
        customerApplicantPage.data,
        (row) => row.id === pendingRequest.id,
      ),
  );
  TestValidator.predicate(
    "customer applicant filter excludes seller request",
    customerApplicantPage.data.every((row) => row.id !== rejectedRequest.id),
  );
  TestValidator.predicate(
    "customer applicant filter returns only customer rows",
    customerApplicantPage.data.every((row) => row.applicantType === "customer"),
  );
  const sellerApplicantPage =
    await api.functional.shoppingMall.customer.administrator_requests.index(
      superAdministratorConnection,
      {
        body: {
          applicantType: "seller",
          page: 1,
          limit: 100,
        } satisfies IShoppingMallAdministratorRequest.IRequest,
      },
    );
  typia.assert(sellerApplicantPage);
  TestValidator.predicate(
    "seller applicant filter includes seller request",
    ArrayUtil.has(
      sellerApplicantPage.data,
      (row) => row.id === rejectedRequest.id,
    ),
  );
  TestValidator.predicate(
    "seller applicant filter excludes customer requests",
    sellerApplicantPage.data.every(
      (row) => row.id !== approvedRequest.id && row.id !== pendingRequest.id,
    ),
  );
  TestValidator.predicate(
    "seller applicant filter returns only seller rows",
    sellerApplicantPage.data.every((row) => row.applicantType === "seller"),
  );
  const reasonSearchPage =
    await api.functional.shoppingMall.customer.administrator_requests.index(
      superAdministratorConnection,
      {
        body: {
          search: customerApprovedReason,
          page: 1,
          limit: 100,
        } satisfies IShoppingMallAdministratorRequest.IRequest,
      },
    );
  typia.assert(reasonSearchPage);
  TestValidator.predicate(
    "reason search returns approved request",
    ArrayUtil.has(
      reasonSearchPage.data,
      (row) => row.id === approvedRequest.id,
    ),
  );
  TestValidator.predicate(
    "reason search rows match searchable text",
    reasonSearchPage.data.every(
      (row) =>
        row.reason.includes(customerApprovedReason) ||
        (row.reviewNote !== null &&
          row.reviewNote.includes(customerApprovedReason)) ||
        (row.rejectionReason !== null &&
          row.rejectionReason.includes(customerApprovedReason)),
    ),
  );
  const reviewNoteSearchPage =
    await api.functional.shoppingMall.customer.administrator_requests.index(
      superAdministratorConnection,
      {
        body: {
          search: approvalReviewNote,
          page: 1,
          limit: 100,
        } satisfies IShoppingMallAdministratorRequest.IRequest,
      },
    );
  typia.assert(reviewNoteSearchPage);
  TestValidator.predicate(
    "review note search returns approved reviewed request",
    ArrayUtil.has(
      reviewNoteSearchPage.data,
      (row) => row.id === approvedRequest.id,
    ),
  );
  TestValidator.predicate(
    "review note search rows match searchable text",
    reviewNoteSearchPage.data.every(
      (row) =>
        row.reason.includes(approvalReviewNote) ||
        (row.reviewNote !== null &&
          row.reviewNote.includes(approvalReviewNote)) ||
        (row.rejectionReason !== null &&
          row.rejectionReason.includes(approvalReviewNote)),
    ),
  );
  const rejectionReasonSearchPage =
    await api.functional.shoppingMall.customer.administrator_requests.index(
      superAdministratorConnection,
      {
        body: {
          search: rejectionReasonText,
          page: 1,
          limit: 100,
        } satisfies IShoppingMallAdministratorRequest.IRequest,
      },
    );
  typia.assert(rejectionReasonSearchPage);
  TestValidator.predicate(
    "rejection reason search returns rejected request",
    ArrayUtil.has(
      rejectionReasonSearchPage.data,
      (row) => row.id === rejectedRequest.id,
    ),
  );
  TestValidator.predicate(
    "rejection reason search rows match searchable text",
    rejectionReasonSearchPage.data.every(
      (row) =>
        row.reason.includes(rejectionReasonText) ||
        (row.reviewNote !== null &&
          row.reviewNote.includes(rejectionReasonText)) ||
        (row.rejectionReason !== null &&
          row.rejectionReason.includes(rejectionReasonText)),
    ),
  );
  const createdAtFrom =
    approvedRequest.created_at < pendingRequest.created_at
      ? approvedRequest.created_at
      : pendingRequest.created_at;
  const createdAtFromFinal =
    createdAtFrom < rejectedRequest.created_at
      ? createdAtFrom
      : rejectedRequest.created_at;
  const createdAtTo =
    approvedRequest.created_at > pendingRequest.created_at
      ? approvedRequest.created_at
      : pendingRequest.created_at;
  const createdAtToFinal =
    createdAtTo > rejectedRequest.created_at
      ? createdAtTo
      : rejectedRequest.created_at;
  const createdRangePage =
    await api.functional.shoppingMall.customer.administrator_requests.index(
      superAdministratorConnection,
      {
        body: {
          createdAtFrom: createdAtFromFinal,
          createdAtTo: createdAtToFinal,
          page: 1,
          limit: 100,
        } satisfies IShoppingMallAdministratorRequest.IRequest,
      },
    );
  typia.assert(createdRangePage);
  TestValidator.predicate(
    "createdAt range includes seeded requests",
    ArrayUtil.has(
      createdRangePage.data,
      (row) => row.id === approvedRequest.id,
    ) &&
      ArrayUtil.has(
        createdRangePage.data,
        (row) => row.id === pendingRequest.id,
      ) &&
      ArrayUtil.has(
        createdRangePage.data,
        (row) => row.id === rejectedRequest.id,
      ),
  );
  const approvedReviewedAt = typia.assert(approvedReviewed.reviewed_at!);
  const rejectedReviewedAt = typia.assert(rejectedReviewed.reviewed_at!);
  const reviewedAtFrom =
    approvedReviewedAt < rejectedReviewedAt
      ? approvedReviewedAt
      : rejectedReviewedAt;
  const reviewedAtTo =
    approvedReviewedAt > rejectedReviewedAt
      ? approvedReviewedAt
      : rejectedReviewedAt;
  const reviewedRangePage =
    await api.functional.shoppingMall.customer.administrator_requests.index(
      superAdministratorConnection,
      {
        body: {
          reviewedAtFrom: reviewedAtFrom,
          reviewedAtTo: reviewedAtTo,
          page: 1,
          limit: 100,
        } satisfies IShoppingMallAdministratorRequest.IRequest,
      },
    );
  typia.assert(reviewedRangePage);
  TestValidator.predicate(
    "reviewedAt range includes reviewed requests",
    ArrayUtil.has(
      reviewedRangePage.data,
      (row) => row.id === approvedRequest.id,
    ) &&
      ArrayUtil.has(
        reviewedRangePage.data,
        (row) => row.id === rejectedRequest.id,
      ),
  );
  TestValidator.predicate(
    "reviewedAt range excludes pending requests with null reviewedAt",
    reviewedRangePage.data.every((row) => row.id !== pendingRequest.id),
  );
  TestValidator.predicate(
    "reviewedAt range returns only reviewed rows with reviewer",
    reviewedRangePage.data.every(
      (row) => row.reviewedAt !== null && row.reviewer !== null,
    ),
  );
  const repeatedFirstPageA =
    await api.functional.shoppingMall.customer.administrator_requests.index(
      superAdministratorConnection,
      {
        body: {
          page: 1,
          limit: 1,
        } satisfies IShoppingMallAdministratorRequest.IRequest,
      },
    );
  typia.assert(repeatedFirstPageA);
  const repeatedFirstPageB =
    await api.functional.shoppingMall.customer.administrator_requests.index(
      superAdministratorConnection,
      {
        body: {
          page: 1,
          limit: 1,
        } satisfies IShoppingMallAdministratorRequest.IRequest,
      },
    );
  typia.assert(repeatedFirstPageB);
  const repeatedSecondPageA =
    await api.functional.shoppingMall.customer.administrator_requests.index(
      superAdministratorConnection,
      {
        body: {
          page: 2,
          limit: 1,
        } satisfies IShoppingMallAdministratorRequest.IRequest,
      },
    );
  typia.assert(repeatedSecondPageA);
  const repeatedSecondPageB =
    await api.functional.shoppingMall.customer.administrator_requests.index(
      superAdministratorConnection,
      {
        body: {
          page: 2,
          limit: 1,
        } satisfies IShoppingMallAdministratorRequest.IRequest,
      },
    );
  typia.assert(repeatedSecondPageB);
  TestValidator.equals(
    "first page boundary is deterministic across repeated calls",
    repeatedFirstPageA.data.map((row) => row.id),
    repeatedFirstPageB.data.map((row) => row.id),
  );
  TestValidator.equals(
    "second page boundary is deterministic across repeated calls",
    repeatedSecondPageA.data.map((row) => row.id),
    repeatedSecondPageB.data.map((row) => row.id),
  );
}
