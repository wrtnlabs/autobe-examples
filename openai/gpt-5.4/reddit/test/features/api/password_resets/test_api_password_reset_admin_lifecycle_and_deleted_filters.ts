import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformMemberPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMemberPasswordReset";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformMemberPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformMemberPasswordReset";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_password_reset_admin_lifecycle_and_deleted_filters(
  connection: api.IConnection,
): Promise<void> {
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: "https://admin.example.com/security/password-resets",
      referrer: "https://admin.example.com/security",
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(admin);
  const now: number = Date.now();
  const page = 1 satisfies number as number;
  const limit = 100 satisfies number as number;
  const lifecycleFilters = ["pending", "used", "revoked", "expired"] as const;
  const deriveLifecycle = (
    item: ICommunityPlatformMemberPasswordReset.ISummary,
  ): "pending" | "used" | "revoked" | "expired" => {
    if (item.used_at !== null) return "used";
    if (item.revoked_at !== null) return "revoked";
    return new Date(item.expired_at).getTime() > now ? "pending" : "expired";
  };
  for (const lifecycle of lifecycleFilters) {
    const response =
      await api.functional.communityPlatform.admin.password_resets.index(
        adminConnection,
        {
          body: {
            lifecycle,
            page,
            limit,
            sort: "created_at_desc",
          } satisfies ICommunityPlatformMemberPasswordReset.IRequest,
        },
      );
    typia.assert(response);
    TestValidator.equals(
      `${lifecycle} page current`,
      response.pagination.current,
      page,
    );
    TestValidator.equals(
      `${lifecycle} page limit`,
      response.pagination.limit,
      limit,
    );
    TestValidator.predicate(
      `${lifecycle} records non-negative`,
      response.pagination.records >= 0,
    );
    TestValidator.predicate(
      `${lifecycle} pages non-negative`,
      response.pagination.pages >= 0,
    );
    TestValidator.predicate(
      `${lifecycle} data within limit`,
      response.data.length <= response.pagination.limit,
    );
    for (const item of response.data) {
      typia.assert(item);
      TestValidator.equals(
        `${lifecycle} derived lifecycle matches for ${item.id}`,
        deriveLifecycle(item),
        lifecycle,
      );
    }
  }
  const defaultBrowse =
    await api.functional.communityPlatform.admin.password_resets.index(
      adminConnection,
      {
        body: {
          page,
          limit,
          sort: "created_at_desc",
        } satisfies ICommunityPlatformMemberPasswordReset.IRequest,
      },
    );
  typia.assert(defaultBrowse);
  const includeDeletedBrowse =
    await api.functional.communityPlatform.admin.password_resets.index(
      adminConnection,
      {
        body: {
          includeDeleted: true,
          page,
          limit,
          sort: "created_at_desc",
        } satisfies ICommunityPlatformMemberPasswordReset.IRequest,
      },
    );
  typia.assert(includeDeletedBrowse);
  TestValidator.equals(
    "default browse page current",
    defaultBrowse.pagination.current,
    page,
  );
  TestValidator.equals(
    "includeDeleted browse page current",
    includeDeletedBrowse.pagination.current,
    page,
  );
  TestValidator.equals(
    "default browse page limit",
    defaultBrowse.pagination.limit,
    limit,
  );
  TestValidator.equals(
    "includeDeleted browse page limit",
    includeDeletedBrowse.pagination.limit,
    limit,
  );
  TestValidator.predicate(
    "default browse records non-negative",
    defaultBrowse.pagination.records >= 0,
  );
  TestValidator.predicate(
    "includeDeleted browse records non-negative",
    includeDeletedBrowse.pagination.records >= 0,
  );
  TestValidator.predicate(
    "default browse pages non-negative",
    defaultBrowse.pagination.pages >= 0,
  );
  TestValidator.predicate(
    "includeDeleted browse pages non-negative",
    includeDeletedBrowse.pagination.pages >= 0,
  );
  TestValidator.predicate(
    "default browse data within limit",
    defaultBrowse.data.length <= defaultBrowse.pagination.limit,
  );
  TestValidator.predicate(
    "includeDeleted browse data within limit",
    includeDeletedBrowse.data.length <= includeDeletedBrowse.pagination.limit,
  );
  for (const item of defaultBrowse.data) {
    typia.assert(item);
    TestValidator.equals(
      `default browse excludes deleted row ${item.id}`,
      item.deleted_at,
      null,
    );
  }
  for (const item of includeDeletedBrowse.data) {
    typia.assert(item);
  }
  const deletedRows = includeDeletedBrowse.data.filter(
    (item) => item.deleted_at !== null,
  );
  for (const item of deletedRows) {
    TestValidator.predicate(
      `deleted row ${item.id} is absent from default browse`,
      ArrayUtil.has(
        defaultBrowse.data,
        (candidate) => candidate.id === item.id,
      ) === false,
    );
  }
}
