import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformGuest";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformGuest";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function test_api_guest_identity_browse_paginated_summary(
  connection: api.IConnection,
): Promise<void> {
  const operatorConnection: api.IConnection = {
    host: connection.host,
  };
  const body = {
    page: 1,
    limit: 10,
    sort: "-created_at",
  } satisfies ICommunityPlatformGuest.IRequest;
  const response = await api.functional.communityPlatform.guests.index(
    operatorConnection,
    {
      body,
    },
  );
  typia.assert(response);
  typia.assertEquals<IPageICommunityPlatformGuest.ISummary>(response);
  typia.assertEquals<IPage.IPagination>(response.pagination);
  TestValidator.predicate(
    "pagination current is non-negative",
    response.pagination.current >= 0,
  );
  TestValidator.predicate(
    "pagination limit is non-negative",
    response.pagination.limit >= 0,
  );
  TestValidator.predicate(
    "data length does not exceed limit",
    response.data.length <= response.pagination.limit,
  );
  for (const guest of response.data) {
    typia.assertEquals<ICommunityPlatformGuest.ISummary>(guest);
    TestValidator.predicate(
      "guest key is not empty",
      guest.guest_key.length > 0,
    );
  }
}
