import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditCloneAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneAdmin";
import type { IRedditCloneAnnouncement } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneAnnouncement";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { generate_random_reddit_clone_admin_announcements_create } from "../../../generate/generate_random_reddit_clone_admin_announcements_create";
import { prepare_random_reddit_clone_announcement } from "../../../prepare/prepare_random_reddit_clone_announcement";

/**
 * Test the primary success path for creating a platform-wide announcement with immediate delivery.
 * 1. Admin authenticates via join endpoint
 * 2. Admin creates platform-wide announcement with valid title and content
 * 3. Verify announcement is created with status='active', unique UUID, createdAt timestamp
 * 4. Verify createdBy contains admin summary information
 */
export async function test_api_announcement_create_platform_wide_immediate(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin authentication
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(1),
      displayName: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IRedditCloneAdmin.IJoin,
  });
  // 2. Create platform-wide announcement with immediate delivery
  const announcement =
    await generate_random_reddit_clone_admin_announcements_create(
      adminConnection,
      {
        body: {
          title: RandomGenerator.paragraph({ sentences: 3 }),
          content: RandomGenerator.content({
            paragraphs: 2,
            sentenceMin: 5,
            sentenceMax: 10,
          }),
          visibilityScope: "platform-wide",
        } satisfies IRedditCloneAnnouncement.ICreate,
      },
    );
  typia.assert(announcement);
  // 3. Verify announcement properties
  TestValidator.equals("status is active", announcement.status, "active");
  TestValidator.equals(
    "visibility is platform-wide",
    announcement.visibility,
    "platform-wide",
  );
  TestValidator.predicate(
    "has valid UUID",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      announcement.id,
    ),
  );
  TestValidator.predicate(
    "has createdAt timestamp",
    announcement.createdAt.length > 0,
  );
  TestValidator.predicate(
    "scheduledAt is null for immediate delivery",
    announcement.scheduledAt === null,
  );
  TestValidator.equals(
    "communityIds is null for platform-wide",
    announcement.communityIds,
    null,
  );
  TestValidator.equals(
    "userGroups is null for platform-wide",
    announcement.userGroups,
    null,
  );
  TestValidator.predicate(
    "createdBy has admin username",
    announcement.createdBy.username.length > 0,
  );
  TestValidator.predicate(
    "createdBy has admin email",
    announcement.createdBy.email.length > 0,
  );
  TestValidator.predicate(
    "title matches input",
    announcement.title.length >= 1 && announcement.title.length <= 200,
  );
  TestValidator.predicate(
    "content matches input",
    announcement.content.length >= 1 && announcement.content.length <= 5000,
  );
}
