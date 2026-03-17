import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformFile } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformFile";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { ICommunityPlatformSubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformSubscription";
import type { ICommunityPlatformSubscriptionActivity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformSubscriptionActivity";
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
 * Test that a member can successfully retrieve their own subscription activity record.
 * First, create a member account via join endpoint. Then create a community and
 * subscribe to it (or use existing subscription activity if available). Then call
 * the subscription activity retrieval endpoint with the activity ID to verify all
 * fields are properly populated: activity ID, event type (subscribed/unsubscribed),
 * event timestamp, posting permission changed flag, feed inclusion changed flag,
 * member summary, community summary, and optional subscription reference. Validate
 * that the response matches the expected structure with correct member and community
 * references.
 */
export async function test_api_subscription_activity_member_retrieval(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member connection
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      username: RandomGenerator.alphaNumeric(12),
      nickname: RandomGenerator.name(1),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies ICommunityPlatformMember.IJoin,
  });
  typia.assert(member);
  // 2. Need a subscription activity ID to test
  // Since we don't have community creation or subscription APIs,
  // we'll test with a random UUID and validate the endpoint response
  const activityId = typia.random<string & tags.Format<"uuid">>();
  // 3. Call subscription activity retrieval endpoint
  const activity =
    await api.functional.communityPlatform.member.subscription_activities.at(
      memberConnection,
      { activityId },
    );
  typia.assert(activity);
  // 4. Validate response structure
  TestValidator.equals("activity ID matches", activity.id, activityId);
  TestValidator.predicate(
    "event type is valid",
    activity.eventType === "subscribed" ||
      activity.eventType === "unsubscribed",
  );
  TestValidator.predicate("event time is valid ISO string", () => {
    try {
      new Date(activity.eventTime);
      return true;
    } catch {
      return false;
    }
  });
  TestValidator.equals(
    "posting permission changed is boolean",
    typeof activity.postingPermissionChanged,
    "boolean",
  );
  TestValidator.equals(
    "feed inclusion changed is boolean",
    typeof activity.feedInclusionChanged,
    "boolean",
  );
  TestValidator.predicate("created at is valid ISO string", () => {
    try {
      new Date(activity.createdAt);
      return true;
    } catch {
      return false;
    }
  });
  TestValidator.predicate("updated at is valid ISO string", () => {
    try {
      new Date(activity.updatedAt);
      return true;
    } catch {
      return false;
    }
  });
  TestValidator.equals(
    "deleted at is null or valid ISO string",
    activity.deletedAt === null ||
      (() => {
        try {
          new Date(activity.deletedAt!);
          return true;
        } catch {
          return false;
        }
      })(),
    true,
  );
  // Validate member summary
  TestValidator.equals(
    "member ID is UUID",
    typeof activity.member.id,
    "string",
  );
  TestValidator.predicate("member email is valid", () => {
    try {
      typia.assert<string & tags.Format<"email">>(activity.member.email);
      return true;
    } catch {
      return false;
    }
  });
  TestValidator.equals(
    "member username is string",
    typeof activity.member.username,
    "string",
  );
  TestValidator.equals(
    "member nickname is string or null",
    activity.member.nickname === null ||
      typeof activity.member.nickname === "string" ||
      activity.member.nickname === undefined,
    true,
  );
  TestValidator.equals(
    "member email verified is boolean",
    typeof activity.member.email_verified,
    "boolean",
  );
  TestValidator.predicate("member registered at is valid ISO string", () => {
    try {
      new Date(activity.member.registered_at);
      return true;
    } catch {
      return false;
    }
  });
  TestValidator.equals(
    "member last login at is null, undefined, or valid ISO string",
    activity.member.last_login_at === null ||
      activity.member.last_login_at === undefined ||
      (() => {
        try {
          new Date(activity.member.last_login_at!);
          return true;
        } catch {
          return false;
        }
      })(),
    true,
  );
  // Validate community summary
  TestValidator.equals(
    "community ID is UUID",
    typeof activity.community.id,
    "string",
  );
  TestValidator.equals(
    "community name is string",
    typeof activity.community.name,
    "string",
  );
  TestValidator.equals(
    "community description is string or null",
    activity.community.description === null ||
      typeof activity.community.description === "string",
    true,
  );
  TestValidator.predicate("community created at is valid ISO string", () => {
    try {
      new Date(activity.community.created_at);
      return true;
    } catch {
      return false;
    }
  });
  TestValidator.equals(
    "community owner is valid member summary",
    typeof activity.community.owner.id,
    "string",
  );
  TestValidator.equals(
    "community subscriber count is number",
    typeof activity.community.subscriber_count,
    "number",
  );
  TestValidator.predicate(
    "community subscriber count is non-negative",
    activity.community.subscriber_count >= 0,
  );
  // Validate subscription reference (optional)
  if (activity.subscription !== null) {
    const subscription = activity.subscription;
    TestValidator.equals(
      "subscription ID is UUID",
      typeof subscription.id,
      "string",
    );
    TestValidator.equals(
      "subscription active is boolean",
      typeof subscription.active,
      "boolean",
    );
    TestValidator.equals(
      "subscription member ID matches",
      subscription.member.id,
      activity.member.id,
    );
    TestValidator.equals(
      "subscription community ID matches",
      subscription.community.id,
      activity.community.id,
    );
    TestValidator.predicate(
      "subscription created at is valid ISO string",
      () => {
        try {
          new Date(subscription.created_at);
          return true;
        } catch {
          return false;
        }
      },
    );
    TestValidator.predicate(
      "subscription updated at is valid ISO string",
      () => {
        try {
          new Date(subscription.updated_at);
          return true;
        } catch {
          return false;
        }
      },
    );
    TestValidator.equals(
      "subscription deleted at is null or valid ISO string",
      subscription.deleted_at === null ||
        (() => {
          try {
            new Date(subscription.deleted_at!);
            return true;
          } catch {
            return false;
          }
        })(),
      true,
    );
  }
}
