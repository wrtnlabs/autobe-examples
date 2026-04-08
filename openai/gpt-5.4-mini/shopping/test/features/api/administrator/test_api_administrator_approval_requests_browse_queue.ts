import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMallPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformAdministrator";
import type { IMallPlatformAdministratorApprovalRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformAdministratorApprovalRequest";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIMallPlatformAdministratorApprovalRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIMallPlatformAdministratorApprovalRequest";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";

export async function test_api_administrator_approval_requests_browse_queue(
  connection: api.IConnection,
): Promise<void> {
  const administratorConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_administrator_join(
    administratorConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: typia.random<string & tags.Format<"password">>(),
      } satisfies IMallPlatformAdministrator.IJoin,
    },
  );
  typia.assert(authorized);
  const request = {
    page: 1,
    limit: 10,
  } satisfies IMallPlatformAdministratorApprovalRequest.IRequest;
  const firstPage =
    await api.functional.mallPlatform.administrator.approvalRequests.index(
      administratorConnection,
      { body: request },
    );
  typia.assert(firstPage);
  TestValidator.predicate(
    "pagination current is valid",
    firstPage.pagination.current >= 0,
  );
  TestValidator.predicate(
    "pagination limit is valid",
    firstPage.pagination.limit >= 0,
  );
  TestValidator.predicate(
    "pagination records is valid",
    firstPage.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages is valid",
    firstPage.pagination.pages >= 0,
  );
  TestValidator.equals(
    "request page echoes page size",
    firstPage.pagination.current,
    request.page,
  );
  TestValidator.equals(
    "request limit echoes page size",
    firstPage.pagination.limit,
    request.limit,
  );
  for (const item of firstPage.data) {
    typia.assert(item);
    TestValidator.predicate("summary id exists", item.id.length > 0);
    TestValidator.predicate("summary reason exists", item.reason.length >= 0);
    TestValidator.predicate("summary status exists", item.status.length > 0);
    TestValidator.predicate(
      "summary rejectionReason is nullable",
      item.rejectionReason === null || item.rejectionReason.length >= 0,
    );
    TestValidator.predicate(
      "summary reviewedAt is nullable",
      item.reviewedAt === null || item.reviewedAt.length > 0,
    );
    TestValidator.predicate(
      "summary createdAt exists",
      item.createdAt.length > 0,
    );
    TestValidator.predicate(
      "summary updatedAt exists",
      item.updatedAt.length > 0,
    );
    TestValidator.predicate(
      "summary deletedAt is nullable",
      item.deletedAt === null || item.deletedAt.length > 0,
    );
  }
  const secondPage =
    await api.functional.mallPlatform.administrator.approvalRequests.index(
      administratorConnection,
      { body: request },
    );
  typia.assert(secondPage);
  TestValidator.equals(
    "browse queue returns the same request ids on repeated reads",
    firstPage.data.map((item) => item.id),
    secondPage.data.map((item) => item.id),
  );
  TestValidator.equals(
    "browse queue pagination remains stable on repeated reads",
    firstPage.pagination,
    secondPage.pagination,
  );
}
