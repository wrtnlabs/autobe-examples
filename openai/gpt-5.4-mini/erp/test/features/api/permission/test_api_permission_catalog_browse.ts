import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmTimeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeMember";
import type { IErpHrmTimePermission } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimePermission";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIErpHrmTimePermission } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIErpHrmTimePermission";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_permission_catalog_browse(
  connection: api.IConnection,
): Promise<void> {
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: `P@ssw0rd${RandomGenerator.alphabets(8)}!` satisfies string,
      name: RandomGenerator.name(),
      href: "https://example.com/signup",
      referrer: "https://example.com/",
      ip: typia.random<(string & tags.Format<"ipv4">) | null>(),
    } satisfies IErpHrmTimeMember.IJoin,
  });
  typia.assert(member);
  const defaultResponse =
    await api.functional.erpHrmTime.member.permissions.index(memberConnection, {
      body: {} satisfies IErpHrmTimePermission.IRequest,
    });
  typia.assert(defaultResponse);
  TestValidator.equals(
    "permission catalog should start on the first page by default",
    defaultResponse.pagination.current,
    1,
  );
  TestValidator.predicate(
    "permission catalog limit should be positive",
    defaultResponse.pagination.limit > 0,
  );
  TestValidator.predicate(
    "permission catalog record count should be non-negative",
    defaultResponse.pagination.records >= 0,
  );
  TestValidator.predicate(
    "permission catalog page count should be non-negative",
    defaultResponse.pagination.pages >= 0,
  );
  TestValidator.predicate(
    "permission catalog results should not exceed the requested limit",
    defaultResponse.data.length <= defaultResponse.pagination.limit,
  );
  const approvedKeys = [
    "org:manage",
    "employee:manage",
    "employee:view",
    "project:manage",
    "project:view",
    "time:manage",
    "time:approve",
    "time:view_all",
    "report:view",
  ] as const;
  TestValidator.predicate(
    "permission catalog should contain approved permissions only",
    defaultResponse.data.every((permission) =>
      approvedKeys.includes(permission.key as (typeof approvedKeys)[number]),
    ),
  );
  for (const permission of defaultResponse.data) {
    typia.assert(permission);
    TestValidator.predicate(
      "permission id should be populated",
      permission.id.length > 0,
    );
    TestValidator.predicate(
      "permission key should be populated",
      permission.key.length > 0,
    );
    TestValidator.predicate(
      "permission description should be populated",
      permission.description.length > 0,
    );
  }
  const searchTarget = defaultResponse.data[0];
  if (searchTarget !== undefined) {
    const searchTerm = RandomGenerator.substring(
      `${searchTarget.key} ${searchTarget.description}`,
    );
    const searched = await api.functional.erpHrmTime.member.permissions.index(
      memberConnection,
      {
        body: {
          search: searchTerm,
          page: 1,
          limit: 50,
          sort: "key",
          order: "asc",
        } satisfies IErpHrmTimePermission.IRequest,
      },
    );
    typia.assert(searched);
    TestValidator.predicate(
      "searched permission catalog should remain within approved permissions",
      searched.data.every((item) =>
        approvedKeys.includes(item.key as (typeof approvedKeys)[number]),
      ),
    );
    TestValidator.predicate(
      "search results should match the requested key or description text",
      searched.data.every(
        (item) =>
          item.key.includes(searchTerm) ||
          item.description.includes(searchTerm),
      ),
    );
    TestValidator.predicate(
      "searched response should obey pagination bounds",
      searched.data.length <= searched.pagination.limit,
    );
  }
}
