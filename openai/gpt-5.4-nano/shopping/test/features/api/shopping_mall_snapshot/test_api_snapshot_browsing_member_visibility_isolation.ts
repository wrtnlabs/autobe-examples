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

export async function test_api_snapshot_browsing_member_visibility_isolation(
  connection: api.IConnection,
): Promise<void> {
  // Create two member accounts
  const memberAConnection: api.IConnection = { host: connection.host };
  const memberA = await authorize_member_join(memberAConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
    } satisfies IShoppingMallMember.IJoin,
  });
  const memberBConnection: api.IConnection = { host: connection.host };
  const memberB = await authorize_member_join(memberBConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
    } satisfies IShoppingMallMember.IJoin,
  });
  // Find any snapshot visible to Member A
  const firstPageA = await api.functional.shoppingMall.member.snapshots.index(
    memberAConnection,
    {
      body: {
        page: 1 satisfies number & tags.Type<"int32"> & tags.Minimum<1>,
        limit: 10 satisfies number &
          tags.Type<"int32"> &
          tags.Minimum<1> &
          tags.Maximum<100>,
      } satisfies IShoppingMallSnapshot.IRequest,
    },
  );
  typia.assert(firstPageA);
  // If Member A sees nothing, Member B must also see nothing for this broad browse
  if (firstPageA.data.length === 0) {
    const emptyB = await api.functional.shoppingMall.member.snapshots.index(
      memberBConnection,
      {
        body: {
          page: 1 satisfies number & tags.Type<"int32"> & tags.Minimum<1>,
          limit: 10 satisfies number &
            tags.Type<"int32"> &
            tags.Minimum<1> &
            tags.Maximum<100>,
        } satisfies IShoppingMallSnapshot.IRequest,
      },
    );
    typia.assert(emptyB);
    TestValidator.equals("member A empty data", firstPageA.data.length, 0);
    TestValidator.equals("member B empty data", emptyB.data.length, 0);
    TestValidator.equals(
      "member A pagination records",
      firstPageA.pagination.records,
      emptyB.pagination.records,
    );
    TestValidator.equals(
      "member A pagination pages",
      firstPageA.pagination.pages,
      emptyB.pagination.pages,
    );
    return;
  }
  const visibleFromA = firstPageA.data[0];
  // Extra check: if snapshot has creator info, it should match Member A
  if (visibleFromA.created_by_member_id !== null) {
    TestValidator.equals(
      "member A sees snapshot it created",
      visibleFromA.created_by_member_id,
      memberA.id,
    );
  }
  // Member A should see that snapshot with the exact same filters
  const filteredA = await api.functional.shoppingMall.member.snapshots.index(
    memberAConnection,
    {
      body: {
        sourceType: visibleFromA.source_type,
        sourceEntityId: visibleFromA.source_entity_id,
        page: 1 satisfies number & tags.Type<"int32"> & tags.Minimum<1>,
        limit: 10 satisfies number &
          tags.Type<"int32"> &
          tags.Minimum<1> &
          tags.Maximum<100>,
      } satisfies IShoppingMallSnapshot.IRequest,
    },
  );
  typia.assert(filteredA);
  TestValidator.equals(
    "member A filtered includes snapshot",
    filteredA.data.some((x) => x.id === visibleFromA.id),
    true,
  );
  // Member B should not see the Member A snapshot with the exact same filters
  const filteredB = await api.functional.shoppingMall.member.snapshots.index(
    memberBConnection,
    {
      body: {
        sourceType: visibleFromA.source_type,
        sourceEntityId: visibleFromA.source_entity_id,
        page: 1 satisfies number & tags.Type<"int32"> & tags.Minimum<1>,
        limit: 10 satisfies number &
          tags.Type<"int32"> &
          tags.Minimum<1> &
          tags.Maximum<100>,
      } satisfies IShoppingMallSnapshot.IRequest,
    },
  );
  typia.assert(filteredB);
  TestValidator.equals(
    "member B filtered does not include member A snapshot",
    filteredB.data.some((x) => x.id === visibleFromA.id),
    false,
  );
  if (filteredB.data.length > 0) {
    TestValidator.predicate(
      "member B does not see snapshots created by member A",
      () => filteredB.data.every((x) => x.created_by_member_id !== memberA.id),
    );
  }
  // Pagination should not leak hidden snapshots
  const filteredBPage2 =
    await api.functional.shoppingMall.member.snapshots.index(
      memberBConnection,
      {
        body: {
          sourceType: visibleFromA.source_type,
          sourceEntityId: visibleFromA.source_entity_id,
          page: 2 satisfies number & tags.Type<"int32"> & tags.Minimum<1>,
          limit: 1 satisfies number &
            tags.Type<"int32"> &
            tags.Minimum<1> &
            tags.Maximum<100>,
          sort: "-created_at",
        } satisfies IShoppingMallSnapshot.IRequest,
      },
    );
  typia.assert(filteredBPage2);
  TestValidator.equals(
    "member B page2 still does not include member A snapshot",
    filteredBPage2.data.some((x) => x.id === visibleFromA.id),
    false,
  );
}
