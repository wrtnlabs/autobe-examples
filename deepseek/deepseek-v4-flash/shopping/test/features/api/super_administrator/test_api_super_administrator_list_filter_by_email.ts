import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IECommerceMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallAdministrator";
import type { IECommerceMallSuperAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallSuperAdministrator";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIECommerceMallSuperAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIECommerceMallSuperAdministrator";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_administrator_join } from "../../../authorize/authorize_super_administrator_join";
import { authorize_super_administrator_login } from "../../../authorize/authorize_super_administrator_login";
import { authorize_super_administrator_refresh } from "../../../authorize/authorize_super_administrator_refresh";

export async function test_api_super_administrator_list_filter_by_email(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as a super administrator via join
  const superAdminConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_super_administrator_join(
    superAdminConnection,
    {},
  );
  typia.assert(authorized);
  // 2. Extract a search keyword from the created super admin's email
  // Use the part before '@' as the keyword for partial matching
  const keyword = authorized.email.split("@")[0];
  // 3. List super administrators filtering by the email keyword
  const page =
    await api.functional.eCommerceMall.superAdministrator.super_administrators.index(
      superAdminConnection,
      {
        body: {
          search: keyword,
        } satisfies IECommerceMallSuperAdministrator.IRequest,
      },
    );
  typia.assert(page);
  // 4. Verify the created super administrator is in the filtered results
  TestValidator.predicate("matching super administrator found in results", () =>
    page.data.some((sa) => sa.id === authorized.id),
  );
  // 5. Verify all returned results contain the search keyword (partial match)
  TestValidator.predicate("all results match the email search keyword", () =>
    page.data.every((sa) => sa.email.includes(keyword)),
  );
  // 6. Verify non-empty results when keyword is from an existing email
  TestValidator.predicate(
    "search results are not empty",
    () => page.data.length > 0,
  );
}
