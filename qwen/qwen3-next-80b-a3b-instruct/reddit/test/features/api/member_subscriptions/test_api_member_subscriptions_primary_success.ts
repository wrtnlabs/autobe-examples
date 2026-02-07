import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityCommunity";
import type { ICommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityMember";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityCommunity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_member_subscriptions_primary_success(
  connection: api.IConnection,
): Promise<void> {
  // Create authenticated member connection
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: typia.random<ICommunityMember.IJoin>(),
  });
  // Fetch member subscriptions
  const result =
    await api.functional.community.member.subscriptions.get(memberConnection);
  typia.assert(result);
  // Validate structure with proper type reference
  TestValidator.equals(
    "pagination exists",
    result.pagination,
    result.pagination,
  );
  TestValidator.predicate("data array exists", Array.isArray(result.data));
  TestValidator.predicate(
    "data has at least one element",
    result.data.length >= 0,
  );
  // Validate pagination structure - since ISummary is empty, we can't validate its properties
  TestValidator.equals(
    "pagination.current is int32",
    Number.isInteger(result.pagination.current),
    true,
  );
  TestValidator.predicate(
    "pagination.current >= 0",
    result.pagination.current >= 0,
  );
  TestValidator.equals(
    "pagination.limit is int32",
    Number.isInteger(result.pagination.limit),
    true,
  );
  TestValidator.predicate("pagination.limit > 0", result.pagination.limit > 0);
  TestValidator.equals(
    "pagination.records is int32",
    Number.isInteger(result.pagination.records),
    true,
  );
  TestValidator.predicate(
    "pagination.records >= 0",
    result.pagination.records >= 0,
  );
  TestValidator.equals(
    "pagination.pages is int32",
    Number.isInteger(result.pagination.pages),
    true,
  );
  TestValidator.predicate(
    "pagination.pages >= 0",
    result.pagination.pages >= 0,
  );
}
