import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityGuest";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityGuest";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function test_api_guest_list_default_pagination(
  connection: api.IConnection,
): Promise<void> {
  // Create a connection without any auth headers (no authentication required)
  const guestConnection: api.IConnection = { host: connection.host };
  // Call PATCH /community/guests with an empty body (no filters, default pagination)
  const response = await api.functional.community.guests.index(
    guestConnection,
    {
      body: {} satisfies ICommunityGuest.IRequest,
    },
  );
  typia.assert(response);
  // Validate default pagination values
  TestValidator.equals("default current page", response.pagination.current, 1);
  TestValidator.equals("default limit", response.pagination.limit, 20);
  // Validate pages calculation: Math.ceil(records / limit), or 0 when records is 0
  const expectedPages =
    response.pagination.records === 0
      ? 0
      : Math.ceil(response.pagination.records / response.pagination.limit);
  TestValidator.equals(
    "pages calculation",
    response.pagination.pages,
    expectedPages,
  );
}
