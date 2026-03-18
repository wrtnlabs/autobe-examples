import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallReview";
import type { IShoppingMallMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallMember";
import type { IShoppingMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallReview";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_review_list_customer_filter_authorization_gating(
  connection: api.IConnection,
): Promise<void> {
  // Member A
  const memberAConnection: api.IConnection = { host: connection.host };
  const memberA = await authorize_member_join(memberAConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IShoppingMallMember.IJoin,
  });
  typia.assert(memberA);
  const page = typia.random<number & tags.Type<"int32"> & tags.Minimum<1>>();
  const limit = typia.random<
    number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<100>
  >();
  // Member A reviews (should be gated to self)
  const listA = await api.functional.shoppingMall.member.reviews.index(
    memberAConnection,
    {
      body: {
        shoppingMallCustomerId: memberA.id,
        page,
        limit,
        sort: "newest",
      } satisfies IShoppingMallReview.IRequest,
    },
  );
  typia.assert(listA);
  TestValidator.predicate(
    "member A should have at least one review to validate gating",
    listA.data.length > 0,
  );
  for (const review of listA.data) {
    TestValidator.equals(
      "returned reviews should belong to authorized customer",
      review.shoppingMallCustomerId,
      memberA.id,
    );
  }
  // Validate newest-first ordering (updatedAt DESC, then createdAt DESC)
  for (let i = 1; i < listA.data.length; ++i) {
    const prev = listA.data[i - 1];
    const curr = listA.data[i];
    const prevUpdatedMs = new Date(prev.updatedAt).getTime();
    const currUpdatedMs = new Date(curr.updatedAt).getTime();
    TestValidator.predicate(
      `updatedAt should be non-increasing at index ${i}`,
      currUpdatedMs <= prevUpdatedMs,
    );
    if (currUpdatedMs === prevUpdatedMs) {
      const prevCreatedMs = new Date(prev.createdAt).getTime();
      const currCreatedMs = new Date(curr.createdAt).getTime();
      TestValidator.predicate(
        `createdAt should be non-increasing when updatedAt ties at index ${i}`,
        currCreatedMs <= prevCreatedMs,
      );
    }
  }
  // Member B
  const memberBConnection: api.IConnection = { host: connection.host };
  const memberB = await authorize_member_join(memberBConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IShoppingMallMember.IJoin,
  });
  typia.assert(memberB);
  // Member B tries to list member A's reviews
  const listB = await api.functional.shoppingMall.member.reviews.index(
    memberBConnection,
    {
      body: {
        shoppingMallCustomerId: memberA.id,
        page,
        limit,
        sort: "newest",
      } satisfies IShoppingMallReview.IRequest,
    },
  );
  typia.assert(listB);
  // Gating: member B should not receive member A's reviews.
  for (const review of listB.data) {
    TestValidator.notEquals(
      "member A's reviews must not be visible to member B",
      review.shoppingMallCustomerId,
      memberA.id,
    );
  }
}
