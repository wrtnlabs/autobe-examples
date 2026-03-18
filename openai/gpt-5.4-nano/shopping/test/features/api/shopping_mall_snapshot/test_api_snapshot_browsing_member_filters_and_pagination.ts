import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallSnapshot";
import type { IShoppingMallMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallMember";
import type { IShoppingMallSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSnapshot";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_snapshot_browsing_member_filters_and_pagination(
  connection: api.IConnection,
): Promise<void> {
  // 1) Member authorization
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
    } satisfies IShoppingMallMember.IJoin,
  });
  const tokenConnection: api.IConnection = { host: connection.host };
  tokenConnection.headers ??= {};
  tokenConnection.headers.Authorization = memberAuth.token.access;
  // 2) Broad request to obtain filterable values
  const page = 1 satisfies number & tags.Type<"int32"> & tags.Minimum<1>;
  const limit = 10 satisfies number &
    tags.Type<"int32"> &
    tags.Minimum<1> &
    tags.Maximum<100>;
  const broadBody = {
    page,
    limit,
  } satisfies IShoppingMallSnapshot.IRequest;
  const broad = await api.functional.shoppingMall.member.snapshots.index(
    tokenConnection,
    {
      body: broadBody,
    },
  );
  typia.assert(broad);
  const first = broad.data[0];
  // 3) Restrictive filter derived from first visible snapshot (if any)
  const restrictFilter: IShoppingMallSnapshot.IRequest =
    first !== undefined
      ? {
          sourceType: first.source_type,
          sourceEntityId: first.source_entity_id,
          createdByMemberId: first.created_by_member_id ?? undefined,
          page,
          limit,
        }
      : {
          page,
          limit,
        };
  const restricted = await api.functional.shoppingMall.member.snapshots.index(
    tokenConnection,
    {
      body: restrictFilter,
    },
  );
  typia.assert(restricted);
  // 4) Business-level filter validation (only for fields we set)
  const rf = restrictFilter;
  for (const item of restricted.data) {
    if (rf.sourceType !== undefined) {
      TestValidator.equals(
        "sourceType matches",
        item.source_type,
        rf.sourceType,
      );
    }
    if (rf.sourceEntityId !== undefined) {
      TestValidator.equals(
        "sourceEntityId matches",
        item.source_entity_id,
        rf.sourceEntityId,
      );
    }
    if (rf.createdByMemberId !== undefined) {
      TestValidator.equals(
        "createdByMemberId matches",
        item.created_by_member_id,
        rf.createdByMemberId,
      );
    }
  }
  // 5) Immutability: re-call same request and compare returned summaries
  const restricted2 = await api.functional.shoppingMall.member.snapshots.index(
    tokenConnection,
    {
      body: restrictFilter,
    },
  );
  typia.assert(restricted2);
  TestValidator.equals(
    "restricted response data stable",
    restricted.data,
    restricted2.data,
  );
  // 6) Empty result path
  const emptyBody = {
    sourceEntityId: typia.random<string & tags.Format<"uuid">>(),
    page,
    limit,
  } satisfies IShoppingMallSnapshot.IRequest;
  const empty = await api.functional.shoppingMall.member.snapshots.index(
    tokenConnection,
    {
      body: emptyBody,
    },
  );
  typia.assert(empty);
  TestValidator.equals("empty data array", empty.data.length, 0);
  TestValidator.equals("empty records", empty.pagination.records, 0);
  TestValidator.equals("empty pages", empty.pagination.pages, 0);
}
