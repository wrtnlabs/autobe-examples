import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallAdministratorGradeChange } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallAdministratorGradeChange";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import type { IShoppingMallAdministratorGradeChange } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministratorGradeChange";
import type { IShoppingMallSuperAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSuperAdministrator";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_administrator_join } from "../../../authorize/authorize_super_administrator_join";
import { authorize_super_administrator_login } from "../../../authorize/authorize_super_administrator_login";
import { authorize_super_administrator_refresh } from "../../../authorize/authorize_super_administrator_refresh";
import { generate_random_shopping_mall_super_administrator_administrators_grade_changes_promote } from "../../../generate/generate_random_shopping_mall_super_administrator_administrators_grade_changes_promote";
import { prepare_random_shopping_mall_administrator_grade_change } from "../../../prepare/prepare_random_shopping_mall_administrator_grade_change";

export async function test_api_administrator_grade_change_history_filtered_page(
  connection: api.IConnection,
): Promise<void> {
  const superAdministratorConnection: api.IConnection = {
    host: connection.host,
  };
  const superAdministrator = await authorize_super_administrator_join(
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
  typia.assert(superAdministrator);
  const targetAdministratorId = typia.random<string & tags.Format<"uuid">>();
  const otherAdministratorId = typia.random<string & tags.Format<"uuid">>();
  const reasonPrefix = `history-filter-${RandomGenerator.alphaNumeric(8)}`;
  const createdChanges: IShoppingMallAdministratorGradeChange[] = [];
  for (const reason of [
    `${reasonPrefix}-alpha`,
    `${reasonPrefix}-beta`,
    `${reasonPrefix}-gamma`,
  ]) {
    try {
      const created =
        await generate_random_shopping_mall_super_administrator_administrators_grade_changes_promote(
          superAdministratorConnection,
          {
            params: {
              administratorId: targetAdministratorId,
            },
            body: {
              reason,
            },
          },
        );
      typia.assert(created);
      createdChanges.push(created);
    } catch {
      break;
    }
  }
  try {
    const otherCreated =
      await generate_random_shopping_mall_super_administrator_administrators_grade_changes_promote(
        superAdministratorConnection,
        {
          params: {
            administratorId: otherAdministratorId,
          },
          body: {
            reason: `${reasonPrefix}-other`,
          },
        },
      );
    typia.assert(otherCreated);
  } catch {}
  const filterSource: IShoppingMallAdministratorGradeChange | undefined =
    createdChanges[0];
  TestValidator.predicate(
    "at least one target administrator grade change is created",
    filterSource !== undefined,
  );
  const request = {
    previous_grade: filterSource.previous_grade,
    new_grade: filterSource.new_grade,
    shopping_mall_super_administrator_id: filterSource.superAdministrator.id,
    page: 1,
    limit: 1,
  } satisfies IShoppingMallAdministratorGradeChange.IRequest;
  const page =
    await api.functional.shoppingMall.superAdministrator.administrators.grade_changes.index(
      superAdministratorConnection,
      {
        administratorId: targetAdministratorId,
        body: request,
      },
    );
  typia.assert(page);
  TestValidator.equals(
    "pagination current echoes request page",
    page.pagination.current,
    request.page,
  );
  TestValidator.equals(
    "pagination limit echoes request limit",
    page.pagination.limit,
    request.limit,
  );
  TestValidator.predicate(
    "page data length does not exceed limit",
    page.data.length <= page.pagination.limit,
  );
  TestValidator.predicate(
    "pagination records covers current data length",
    page.pagination.records >= page.data.length,
  );
  TestValidator.equals(
    "pagination pages formula",
    page.pagination.pages,
    Math.ceil(page.pagination.records / page.pagination.limit),
  );
  TestValidator.predicate(
    "filtered page has at least one record",
    page.data.length >= 1,
  );
  for (const row of page.data) {
    TestValidator.equals(
      "row previous_grade matches filter",
      row.previous_grade,
      request.previous_grade,
    );
    TestValidator.equals(
      "row new_grade matches filter",
      row.new_grade,
      request.new_grade,
    );
    TestValidator.equals(
      "row acting super administrator matches filter",
      row.superAdministrator.id,
      request.shopping_mall_super_administrator_id,
    );
  }
  const repeated =
    await api.functional.shoppingMall.superAdministrator.administrators.grade_changes.index(
      superAdministratorConnection,
      {
        administratorId: targetAdministratorId,
        body: request,
      },
    );
  typia.assert(repeated);
  TestValidator.equals(
    "repeated filtered history response is stable",
    repeated,
    page,
  );
}
