import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMallPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformAdministrator";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIMallPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIMallPlatformAdministrator";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";

export async function test_api_administrator_administrators_empty_result_page(
  connection: api.IConnection,
): Promise<void> {
  /**
   * Verify administrator browsing returns an empty paginated result when no accounts match.
   *
   * This test authenticates a privileged administrator, queries the governance-only administrator
   * collection with a search term that should match nothing, and validates that the service returns
   * a well-formed empty page instead of failing. It also checks that pagination metadata remains
   * coherent for the empty result set.
   *
   * 1. Authenticate an administrator through the dedicated join utility using an isolated connection.
   * 2. Request the administrator browse endpoint with a highly specific unmatched search term.
   * 3. Validate the returned page shape, empty data array, and empty-result pagination metadata.
   */
  const administratorConnection: api.IConnection = { host: connection.host };
  await authorize_administrator_join(administratorConnection, {
    body: {
      email:
        `admin-${RandomGenerator.alphaNumeric(12)}@example.com` satisfies IMallPlatformAdministrator.IJoin["email"],
      password:
        `P@ssw0rd-${RandomGenerator.alphaNumeric(12)}` satisfies IMallPlatformAdministrator.IJoin["password"],
    } satisfies IMallPlatformAdministrator.IJoin,
  });
  const output =
    await api.functional.mallPlatform.administrator.administrators.index(
      administratorConnection,
      {
        body: {
          search: `no-match-${RandomGenerator.alphaNumeric(24)}`,
          page: 1,
          limit: 10,
        } satisfies IMallPlatformAdministrator.IRequest,
      },
    );
  typia.assert(output);
  TestValidator.equals("empty data array", output.data, []);
  TestValidator.equals("no matching records", output.pagination.records, 0);
  TestValidator.equals(
    "no pages for empty result set",
    output.pagination.pages,
    0,
  );
  TestValidator.predicate(
    "pagination values remain non-negative",
    output.pagination.current >= 0 &&
      output.pagination.limit >= 0 &&
      output.pagination.records >= 0 &&
      output.pagination.pages >= 0,
  );
}
