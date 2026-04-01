import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMallPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformAdministrator";
import type { IMallPlatformSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSeller";
import type { IMallPlatformSellerApprovalRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSellerApprovalRequest";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIMallPlatformSellerApprovalRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIMallPlatformSellerApprovalRequest";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";

export async function test_api_seller_approval_requests_browse_pagination(
  connection: api.IConnection,
): Promise<void> {
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_administrator_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IMallPlatformAdministrator.IJoin,
  });
  const page =
    await api.functional.mallPlatform.administrator.seller_approval_requests.index(
      adminConnection,
      {
        body: {
          page: 1,
          limit: 1,
        } satisfies IMallPlatformSellerApprovalRequest.IRequest,
      },
    );
  typia.assert(page);
  TestValidator.predicate(
    "pagination current is at least 1",
    page.pagination.current >= 1,
  );
  TestValidator.predicate(
    "pagination limit is positive",
    page.pagination.limit >= 1,
  );
  TestValidator.predicate(
    "pagination pages is non-negative",
    page.pagination.pages >= 0,
  );
  TestValidator.predicate(
    "pagination records is non-negative",
    page.pagination.records >= 0,
  );
  const emptyPage =
    await api.functional.mallPlatform.administrator.seller_approval_requests.index(
      adminConnection,
      {
        body: {
          page: page.pagination.pages + 1,
          limit: 1,
        } satisfies IMallPlatformSellerApprovalRequest.IRequest,
      },
    );
  typia.assert(emptyPage);
  TestValidator.equals("empty page returns no data", emptyPage.data.length, 0);
  TestValidator.predicate(
    "empty page pagination is valid",
    emptyPage.pagination.current === page.pagination.pages + 1 &&
      emptyPage.pagination.limit === 1 &&
      emptyPage.pagination.records >= 0 &&
      emptyPage.pagination.pages >= 0,
  );
}
