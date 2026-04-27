import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunitySnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunitySnapshot";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformProfile";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

/**
 * Test that retrieving a snapshot from a non-existent community returns 404 Not Found.
 *
 * Validates that the snapshot retrieval endpoint correctly validates community existence before attempting snapshot lookup. The community lookup fails first, so the result is the same regardless of whether the snapshot ID exists.
 *
 * 1. Register a new member via the join utility to obtain authentication.
 * 2. Attempt to retrieve a snapshot using random UUIDs for both communityId and snapshotId.
 * 3. Validate that a 404 HTTP error is thrown.
 */
export async function test_api_community_snapshot_community_not_found(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a new member
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {});
  // 2. Attempt to retrieve a snapshot from a non-existent community
  await TestValidator.httpError(
    "snapshot from non-existent community returns 404",
    404,
    () =>
      api.functional.communityPlatform.member.communities.snapshots.at(
        memberConnection,
        {
          communityId: typia.random<string & tags.Format<"uuid">>(),
          snapshotId: typia.random<string & tags.Format<"uuid">>(),
        },
      ),
  );
}
