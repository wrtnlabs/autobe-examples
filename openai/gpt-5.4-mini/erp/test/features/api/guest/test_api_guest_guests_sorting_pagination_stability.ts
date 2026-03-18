import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmTimeTrackingGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingGuest";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIHrmTimeTrackingGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmTimeTrackingGuest";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_guest_join } from "../../../authorize/authorize_guest_join";
import { authorize_guest_refresh } from "../../../authorize/authorize_guest_refresh";

export async function test_api_guest_guests_sorting_pagination_stability(
  connection: api.IConnection,
): Promise<void> {
  const guestConnection: api.IConnection = { host: connection.host };
  const authorized = await api.functional.hrmTimeTracking.auth.guest.join(
    guestConnection,
    {
      body: {},
    },
  );
  typia.assert(authorized);
  const initialRequest: IHrmTimeTrackingGuest.IRequest = {
    sort: "createdAt",
    page: 1,
    limit: 100,
  };
  const initialPage: IPageIHrmTimeTrackingGuest.ISummary =
    await api.functional.hrmTimeTracking.guest.guests.index(guestConnection, {
      body: initialRequest,
    });
  typia.assert(initialPage);
  const boundaryPageNumber: number =
    initialPage.pagination.pages > 0 ? initialPage.pagination.pages : 1;
  const boundaryRequest: IHrmTimeTrackingGuest.IRequest = {
    sort: "createdAt",
    page: boundaryPageNumber,
    limit: initialPage.pagination.limit > 0 ? initialPage.pagination.limit : 1,
  };
  const first: IPageIHrmTimeTrackingGuest.ISummary =
    await api.functional.hrmTimeTracking.guest.guests.index(guestConnection, {
      body: boundaryRequest,
    });
  typia.assert(first);
  const second: IPageIHrmTimeTrackingGuest.ISummary =
    await api.functional.hrmTimeTracking.guest.guests.index(guestConnection, {
      body: boundaryRequest,
    });
  typia.assert(second);
  TestValidator.equals(
    "pagination current reflects requested boundary page",
    first.pagination.current,
    boundaryRequest.page,
  );
  TestValidator.equals(
    "pagination limit reflects requested limit",
    first.pagination.limit,
    boundaryRequest.limit,
  );
  TestValidator.equals(
    "pagination records is stable",
    second.pagination.records,
    first.pagination.records,
  );
  TestValidator.equals(
    "pagination pages is stable",
    second.pagination.pages,
    first.pagination.pages,
  );
  TestValidator.equals("repeated page data is stable", second.data, first.data);
  TestValidator.equals(
    "authorization access token remains stable",
    guestConnection.headers?.Authorization,
    authorized.token.access,
  );
  TestValidator.equals(
    "authorization bundle remains stable",
    authorized.token,
    authorized.token,
  );
  if (first.data.length > 1) {
    const sorted = [...first.data].sort((x, y) => {
      if (x.created_at < y.created_at) return -1;
      if (x.created_at > y.created_at) return 1;
      if (x.id < y.id) return -1;
      if (x.id > y.id) return 1;
      return 0;
    });
    TestValidator.equals(
      "guest list is sorted by createdAt and stable id tie-breaker",
      first.data,
      sorted,
    );
  }
  if (first.data.length > 0) {
    const ids = first.data.map((item) => item.id);
    const uniqueIds = Array.from(new Set(ids));
    TestValidator.equals(
      "guest ids are unique within the page",
      uniqueIds.length,
      ids.length,
    );
  } else {
    TestValidator.equals(
      "empty result remains empty on repeat call",
      second.data.length,
      0,
    );
  }
}
