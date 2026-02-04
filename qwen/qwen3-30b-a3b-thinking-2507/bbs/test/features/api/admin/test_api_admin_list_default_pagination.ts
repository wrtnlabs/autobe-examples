import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconPoliticBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPoliticBoardAdmin";
import type { IEconPoliticBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPoliticBoardMember";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEconPoliticBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEconPoliticBoardAdmin";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_admin_list_default_pagination(
  connection: api.IConnection,
): Promise<void> {
  // 1. Auth with admin
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {} satisfies IEconPoliticBoardAdmin.IJoin,
  });
  // 2. Call the API with default pagination parameters
  const output: IPageIEconPoliticBoardAdmin.ISummary =
    await api.functional.econPoliticBoard.admins.index(adminConnection, {
      body: {
        page: 1,
        limit: 20,
      } satisfies IEconPoliticBoardAdmin.IRequest,
    });
  typia.assert(output);
  // 3. Verify that exactly 20 items were returned
  TestValidator.equals(
    "should return exactly 20 items",
    output.data.length,
    20,
  );
  // 4. Verify pagination metadata
  TestValidator.equals("pagination current", output.pagination.current, 1);
  TestValidator.equals("pagination limit", output.pagination.limit, 20);
  TestValidator.equals("pagination records", output.pagination.records, 20);
  TestValidator.equals("pagination pages", output.pagination.pages, 1);
  // 5. Verify the first admin has required fields
  const admin = output.data[0];
  TestValidator.predicate(
    "admin id should be valid UUID",
    () => admin.id.length === 36,
  );
  TestValidator.equals("admin role present", admin.role, "admin");
  TestValidator.equals("admin status present", admin.status, "active");
  TestValidator.predicate(
    "admin member name should be non-empty",
    () => admin.member.name.length > 0,
  );
}
