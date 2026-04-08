import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMallPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformAdministrator";
import type { IMallPlatformAdministratorApprovalRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformAdministratorApprovalRequest";
import type { IMallPlatformSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSeller";
import type { IMallPlatformSellerAccount } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSellerAccount";
import type { IMallPlatformSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSellerProfile";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIMallPlatformAdministratorApprovalRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIMallPlatformAdministratorApprovalRequest";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";

export async function test_api_seller_approval_requests_review_list(
  connection: api.IConnection,
): Promise<void> {
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerConnection, {
    body: {
      email: `${RandomGenerator.alphabets(8)}@test.com`,
      password: "Test1234!",
    } satisfies IMallPlatformSeller.IJoin,
  });
  const firstRequest = {
    page: 1,
    limit: 5,
    sort: "createdAt",
    order: "desc",
  } satisfies IMallPlatformAdministratorApprovalRequest.IRequest;
  const firstResponse =
    await api.functional.mallPlatform.seller.approval_requests.index(
      sellerConnection,
      { body: firstRequest },
    );
  typia.assert(firstResponse);
  const secondResponse =
    await api.functional.mallPlatform.seller.approval_requests.index(
      sellerConnection,
      {
        body: {
          page: 2,
          limit: 5,
          sort: "createdAt",
          order: "desc",
        } satisfies IMallPlatformAdministratorApprovalRequest.IRequest,
      },
    );
  typia.assert(secondResponse);
  const searchKeyword = RandomGenerator.alphabets(12);
  const filteredResponse =
    await api.functional.mallPlatform.seller.approval_requests.index(
      sellerConnection,
      {
        body: {
          search: searchKeyword,
          status: "pending",
          page: 1,
          limit: 10,
          sort: "createdAt",
          order: "asc",
        } satisfies IMallPlatformAdministratorApprovalRequest.IRequest,
      },
    );
  typia.assert(filteredResponse);
  TestValidator.predicate(
    "first page pagination is valid",
    firstResponse.pagination.current >= 1 &&
      firstResponse.pagination.limit >= 1 &&
      firstResponse.pagination.records >= 0 &&
      firstResponse.pagination.pages >= 0,
  );
  TestValidator.predicate(
    "second page pagination is valid",
    secondResponse.pagination.current >= 1 &&
      secondResponse.pagination.limit >= 1 &&
      secondResponse.pagination.records >= 0 &&
      secondResponse.pagination.pages >= 0,
  );
  TestValidator.predicate(
    "filtered page pagination is valid",
    filteredResponse.pagination.current >= 1 &&
      filteredResponse.pagination.limit >= 1 &&
      filteredResponse.pagination.records >= 0 &&
      filteredResponse.pagination.pages >= 0,
  );
  TestValidator.predicate(
    "every approval request summary includes expected review fields",
    firstResponse.data.every(
      (item) =>
        item.id.length > 0 &&
        item.reason.length >= 0 &&
        item.status.length > 0 &&
        (item.rejectionReason === null || item.rejectionReason.length >= 0) &&
        (item.reviewedAt === null || item.reviewedAt.length > 0) &&
        item.createdAt.length > 0 &&
        item.updatedAt.length > 0 &&
        (item.deletedAt === null || item.deletedAt.length > 0) &&
        item.administrator !== null &&
        (item.reviewerAdministrator === null ||
          item.reviewerAdministrator !== null),
    ),
  );
  const repeatedResponse =
    await api.functional.mallPlatform.seller.approval_requests.index(
      sellerConnection,
      { body: firstRequest },
    );
  typia.assert(repeatedResponse);
  TestValidator.equals(
    "repeated read should keep pagination total stable",
    repeatedResponse.pagination,
    firstResponse.pagination,
  );
  TestValidator.equals(
    "repeated read should keep the same page size and ordering",
    repeatedResponse.data.map((item) => item.id),
    firstResponse.data.map((item) => item.id),
  );
}
