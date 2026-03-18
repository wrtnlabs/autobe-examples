import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformCommunityBanSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityBanSnapshot";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_community_ban_snapshot_retrieve_success_and_scope_errors(
  connection: api.IConnection,
): Promise<void> {
  const adminConnection: api.IConnection = { host: connection.host };
  const memberConnection: api.IConnection = { host: connection.host };
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const password = RandomGenerator.alphaNumeric(16) satisfies string &
    tags.Format<"password">;
  await authorize_admin_login(adminConnection, {
    body: {
      email: adminEmail,
      password,
    } satisfies ICommunityPlatformAdmin.ILogin,
  });
  await authorize_member_login(memberConnection, {
    body: {
      email: memberEmail,
      password,
      href: "https://example.com/" + RandomGenerator.alphabets(6),
      referrer: "https://example.com/ref/" + RandomGenerator.alphabets(6),
    } satisfies ICommunityPlatformMember.ILogin,
  });
  const banIdA = typia.random<string & tags.Format<"uuid">>();
  const snapshotIdA = typia.random<string & tags.Format<"uuid">>();
  // Scenario 1: success retrieval
  const snapshot =
    await api.functional.communityPlatform.admin.bans.snapshots.at(
      adminConnection,
      {
        banId: banIdA,
        snapshotId: snapshotIdA,
      },
    );
  typia.assert(snapshot);
  TestValidator.equals(
    "snapshot.id matches snapshotId",
    snapshot.id,
    snapshotIdA,
  );
  TestValidator.equals(
    "snapshot.community_ban_id matches banId",
    snapshot.community_ban_id,
    banIdA,
  );
  // Scenario 2: mismatch banId/snapshotId should be not found
  const banIdB = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.httpError(
    "snapshot not found for mismatched banId/snapshotId",
    [404],
    async () => {
      await api.functional.communityPlatform.admin.bans.snapshots.at(
        adminConnection,
        {
          banId: banIdB,
          snapshotId: snapshotIdA,
        },
      );
    },
  );
  // Scenario 3: member cannot access admin endpoint
  await TestValidator.httpError(
    "member forbidden for admin ban snapshot",
    [401, 403],
    async () => {
      await api.functional.communityPlatform.admin.bans.snapshots.at(
        memberConnection,
        {
          banId: banIdA,
          snapshotId: snapshotIdA,
        },
      );
    },
  );
}
