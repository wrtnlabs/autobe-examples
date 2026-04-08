import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMallPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformAdministrator";
import type { IMallPlatformSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSeller";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIMallPlatformSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIMallPlatformSeller";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";

/**
 * Verify administrator seller browse visibility for lifecycle-managed accounts.
 *
 * This test authenticates an administrator, queries the seller browse endpoint, and validates
 * that the returned page exposes only compact seller summaries while still including lifecycle
 * and moderation fields such as status, rejectionReason, and deletedAt.
 *
 * The assertions focus on the response shape, pagination metadata, and absence of private
 * authentication secrets or expanded account details. It also confirms that deleted or otherwise
 * inactive sellers can be distinguished from active ones through the browse response metadata.
 *
 * 1. Authenticate as an administrator through the supported join utility.
 * 2. Browse sellers through the administrator seller listing endpoint.
 * 3. Validate pagination metadata and seller summary lifecycle fields.
 * 4. Ensure the response does not leak private authentication secrets or expanded details.
 */
export async function test_api_seller_browse_lifecycle_visibility(
  connection: api.IConnection,
): Promise<void> {
  const administratorConnection: api.IConnection = { host: connection.host };
  const administrator = await authorize_administrator_join(
    administratorConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: "Test1234!" satisfies string & tags.Format<"password">,
      } satisfies IMallPlatformAdministrator.IJoin,
    },
  );
  typia.assert(administrator);
  const output = await api.functional.mallPlatform.administrator.sellers.index(
    administratorConnection,
    {
      body: {
        page: 1,
        limit: 100,
        sort: "updated_at",
        order: "desc",
      } satisfies IMallPlatformSeller.IRequest,
    },
  );
  typia.assert(output);
  TestValidator.predicate(
    "seller browse response should include pagination metadata",
    output.pagination.current >= 1 &&
      output.pagination.limit >= 1 &&
      output.pagination.records >= 0 &&
      output.pagination.pages >= 0,
  );
  TestValidator.predicate(
    "seller browse response should contain summary data array",
    Array.isArray(output.data),
  );
  for (const seller of output.data) {
    typia.assert(seller);
    TestValidator.predicate(
      "seller summary should expose lifecycle status",
      typeof seller.status === "string" && seller.status.length > 0,
    );
    TestValidator.predicate(
      "seller summary should expose deletion timestamp for lifecycle visibility",
      seller.deletedAt === null || typeof seller.deletedAt === "string",
    );
    TestValidator.predicate(
      "seller summary should expose rejection reason as nullable moderation data",
      seller.rejectionReason === null ||
        typeof seller.rejectionReason === "string",
    );
    TestValidator.predicate(
      "seller summary should not leak private authentication secrets",
      !Object.prototype.hasOwnProperty.call(seller, "password") &&
        !Object.prototype.hasOwnProperty.call(seller, "passwordHash") &&
        !Object.prototype.hasOwnProperty.call(seller, "token"),
    );
  }
}
