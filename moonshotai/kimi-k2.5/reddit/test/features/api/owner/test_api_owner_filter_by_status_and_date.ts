import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditLikeOwner } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditLikeOwner";
import type { IRedditLikeOwner } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeOwner";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_owner_join } from "../../../authorize/authorize_owner_join";
import { authorize_owner_login } from "../../../authorize/authorize_owner_login";
import { authorize_owner_refresh } from "../../../authorize/authorize_owner_refresh";

export async function test_api_owner_filter_by_status_and_date(
  connection: api.IConnection,
): Promise<void> {
  // Create owner connection and register an active owner account
  const ownerConnection: api.IConnection = { host: connection.host };
  const createdOwner = await authorize_owner_join(ownerConnection, {});
  typia.assert(createdOwner);
  // Record creation time for date range testing
  const ownerCreatedAt = createdOwner.created_at;
  // Calculate date ranges
  const oneHourBefore = new Date(
    new Date(ownerCreatedAt).getTime() - 60 * 60 * 1000,
  ).toISOString();
  const oneHourAfter = new Date(
    new Date(ownerCreatedAt).getTime() + 60 * 60 * 1000,
  ).toISOString();
  const oneDayBefore = new Date(
    new Date(ownerCreatedAt).getTime() - 24 * 60 * 60 * 1000,
  ).toISOString();
  // Test 1: Filter with isActive=true and date range including creation time
  const activeFilterResult = await api.functional.redditLike.owners.index(
    ownerConnection,
    {
      body: {
        isActive: true,
        createdAtFrom: oneHourBefore,
        createdAtTo: oneHourAfter,
      } satisfies IRedditLikeOwner.IRequest,
    },
  );
  typia.assert(activeFilterResult);
  // Verify the created owner is in results
  TestValidator.predicate(
    "active owner with date range includes created owner",
    activeFilterResult.data.some((owner) => owner.id === createdOwner.id),
  );
  // Test 2: Filter with isActive=false - should not return our active owner
  const inactiveFilterResult = await api.functional.redditLike.owners.index(
    ownerConnection,
    {
      body: {
        isActive: false,
        createdAtFrom: oneHourBefore,
        createdAtTo: oneHourAfter,
      } satisfies IRedditLikeOwner.IRequest,
    },
  );
  typia.assert(inactiveFilterResult);
  TestValidator.predicate(
    "inactive filter excludes active owner",
    !inactiveFilterResult.data.some((owner) => owner.id === createdOwner.id),
  );
  // Test 3: Date range boundary - createdAtTo before owner creation
  const boundaryResult = await api.functional.redditLike.owners.index(
    ownerConnection,
    {
      body: {
        isActive: true,
        createdAtFrom: oneDayBefore,
        createdAtTo: oneHourBefore,
      } satisfies IRedditLikeOwner.IRequest,
    },
  );
  typia.assert(boundaryResult);
  // Should return no results or not include our owner
  TestValidator.predicate(
    "date range ending before creation excludes owner",
    !boundaryResult.data.some((owner) => owner.id === createdOwner.id),
  );
  // Test 4: No active filter (undefined) with date range including creation time
  const noActiveFilterResult = await api.functional.redditLike.owners.index(
    ownerConnection,
    {
      body: {
        createdAtFrom: oneHourBefore,
        createdAtTo: oneHourAfter,
      } satisfies IRedditLikeOwner.IRequest,
    },
  );
  typia.assert(noActiveFilterResult);
  // Should include our active owner
  TestValidator.predicate(
    "no active filter includes active owner in date range",
    noActiveFilterResult.data.some((owner) => owner.id === createdOwner.id),
  );
}
