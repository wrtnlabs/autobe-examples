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

export async function test_api_administrator_approval_requests_filtered_pagination(
  connection: api.IConnection,
): Promise<void> {
  const superAdministratorConnection: api.IConnection = {
    host: connection.host,
  };
  await authorize_administrator_join(superAdministratorConnection, {
    body: {
      email:
        `super.${RandomGenerator.alphaNumeric(8)}@test.com` satisfies string &
          tags.Format<"email">,
      password: "Test1234!" satisfies string & tags.Format<"password">,
    } satisfies IMallPlatformAdministrator.IJoin,
  });
  const first =
    await api.functional.mallPlatform.administrator.administrator_approval_requests.index(
      superAdministratorConnection,
      {
        body: {
          page: 1,
          limit: 5,
        } satisfies IMallPlatformAdministratorApprovalRequest.IRequest,
      },
    );
  typia.assert(first);
  const second =
    await api.functional.mallPlatform.administrator.administrator_approval_requests.index(
      superAdministratorConnection,
      {
        body: {
          page: 2,
          limit: 5,
        } satisfies IMallPlatformAdministratorApprovalRequest.IRequest,
      },
    );
  typia.assert(second);
  TestValidator.equals(
    "pagination limit is preserved on first page",
    first.pagination.limit,
    5,
  );
  TestValidator.equals(
    "pagination limit is preserved on second page",
    second.pagination.limit,
    5,
  );
  TestValidator.predicate(
    "pagination page advances",
    first.pagination.current === 1 && second.pagination.current === 2,
  );
  TestValidator.predicate(
    "pagination records are non-negative",
    first.pagination.records >= 0 && second.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages are non-negative",
    first.pagination.pages >= 0 && second.pagination.pages >= 0,
  );
  const pending =
    await api.functional.mallPlatform.administrator.administrator_approval_requests.index(
      superAdministratorConnection,
      {
        body: {
          status: "pending",
          page: 1,
          limit: 20,
        } satisfies IMallPlatformAdministratorApprovalRequest.IRequest,
      },
    );
  typia.assert(pending);
  TestValidator.predicate(
    "pending filter returns only pending requests",
    pending.data.every((request) => request.status === "pending"),
  );
  const approved =
    await api.functional.mallPlatform.administrator.administrator_approval_requests.index(
      superAdministratorConnection,
      {
        body: {
          status: "approved",
          page: 1,
          limit: 20,
        } satisfies IMallPlatformAdministratorApprovalRequest.IRequest,
      },
    );
  typia.assert(approved);
  TestValidator.predicate(
    "approved filter returns only approved requests",
    approved.data.every((request) => request.status === "approved"),
  );
  const rejected =
    await api.functional.mallPlatform.administrator.administrator_approval_requests.index(
      superAdministratorConnection,
      {
        body: {
          status: "rejected",
          page: 1,
          limit: 20,
        } satisfies IMallPlatformAdministratorApprovalRequest.IRequest,
      },
    );
  typia.assert(rejected);
  TestValidator.predicate(
    "rejected filter returns only rejected requests",
    rejected.data.every((request) => request.status === "rejected"),
  );
  TestValidator.predicate(
    "default ordering is newest first",
    (() => {
      for (let i = 1; i < first.data.length; ++i) {
        if (first.data[i - 1].createdAt < first.data[i].createdAt) return false;
      }
      return true;
    })(),
  );
}
