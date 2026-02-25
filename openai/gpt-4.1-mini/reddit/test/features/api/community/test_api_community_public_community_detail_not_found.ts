import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformGuest";
import type { ICommunityPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_guest_join } from "../../../authorize/authorize_guest_join";
import { authorize_guest_refresh } from "../../../authorize/authorize_guest_refresh";

/**
 * Test retrieval with a non-existent community UUID to validate error handling and correct HTTP 404 response.
 * Ensure that the response body clearly indicates the community is not found.
 */
export async function test_api_community_public_community_detail_not_found(
  connection: api.IConnection,
): Promise<void> {
  // 1. Guest join to obtain authorized guest connection
  const guestJoinConnection: api.IConnection = { host: connection.host };
  const guestJoinResult = await authorize_guest_join(guestJoinConnection, {
    body: { deviceFingerprint: typia.random<string & tags.Format<"uuid">>() },
  });
  typia.assert(guestJoinResult);
  // 2. Attempt to retrieve a community with a random non-existent UUID
  const fakeCommunityId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.httpError(
    "community detail retrieval for non-existent UUID should fail with 404",
    404,
    async () => {
      await api.functional.communityPlatform.guest.communities.at(
        guestJoinConnection,
        {
          communityId: fakeCommunityId,
        },
      );
    },
  );
}
