import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditPlatformBanRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformBanRecord";
import type { IRedditPlatformBanRecordSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformBanRecordSnapshot";
import type { IRedditPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunity";
import type { IRedditPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_member_ban_snapshots_retrieve_success(
  connection: api.IConnection,
): Promise<void> {
  // Create a member account for authentication
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuthorized = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "password1234",
      username:
        RandomGenerator.alphaNumeric(8) + "_" + RandomGenerator.alphaNumeric(3),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IRedditPlatformMember.IJoin,
  });
  typia.assert(memberAuthorized);
  // Generate a valid snapshot UUID for testing
  const snapshotId = typia.random<string & tags.Format<"uuid">>();
  // Retrieve the ban snapshot
  const snapshot = await api.functional.redditPlatform.member.ban_snapshots.at(
    memberConnection,
    {
      snapshotId,
    },
  );
  typia.assert(snapshot);
  // Validate response contains expected structure
  TestValidator.equals("snapshot id matches request", snapshot.id, snapshotId);
  TestValidator.predicate(
    "ban record reference exists",
    snapshot.reddit_platform_ban_record_id !== undefined,
  );
  TestValidator.predicate(
    "user reference exists",
    snapshot.reddit_platform_user_id !== undefined,
  );
  TestValidator.predicate(
    "community reference exists",
    snapshot.reddit_platform_community_id !== undefined,
  );
  TestValidator.predicate("ban reason has content", snapshot.reason.length > 0);
  TestValidator.predicate(
    "banned at timestamp exists",
    snapshot.banned_at !== undefined,
  );
  TestValidator.predicate(
    "snapshot created at timestamp exists",
    snapshot.snapshot_created_at !== undefined,
  );
  // Validate banRecord nested object structure
  TestValidator.notEquals(
    "banRecord user exists",
    snapshot.banRecord.user,
    undefined,
  );
  TestValidator.notEquals(
    "banRecord community exists",
    snapshot.banRecord.community,
    undefined,
  );
  TestValidator.notEquals(
    "banRecord banned_by exists",
    snapshot.banRecord.banned_by,
    undefined,
  );
  // Validate banRecord.user summary fields
  const user = snapshot.banRecord.user;
  TestValidator.notEquals("user id exists", user.id, undefined);
  TestValidator.notEquals("user username exists", user.username, undefined);
  TestValidator.notEquals("user karma exists", user.karma, undefined);
  TestValidator.notEquals("user created_at exists", user.created_at, undefined);
  // Validate banRecord.community summary fields
  const community = snapshot.banRecord.community;
  TestValidator.notEquals("community id exists", community.id, undefined);
  TestValidator.notEquals("community name exists", community.name, undefined);
  TestValidator.notEquals(
    "community subscriber_count exists",
    community.subscriber_count,
    undefined,
  );
  TestValidator.notEquals("community owner exists", community.owner, undefined);
  // Validate banRecord.banned_by summary fields
  const bannedBy = snapshot.banRecord.banned_by;
  TestValidator.notEquals("banned_by id exists", bannedBy.id, undefined);
  TestValidator.notEquals(
    "banned_by username exists",
    bannedBy.username,
    undefined,
  );
  TestValidator.notEquals("banned_by karma exists", bannedBy.karma, undefined);
  TestValidator.notEquals(
    "banned_by created_at exists",
    bannedBy.created_at,
    undefined,
  );
}
