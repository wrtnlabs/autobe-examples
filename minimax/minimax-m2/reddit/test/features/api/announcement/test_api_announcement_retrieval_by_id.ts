import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IRedditPlatformAnnouncement } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformAnnouncement";

export async function test_api_announcement_retrieval_by_id(
  connection: api.IConnection,
) {
  const announcementId = typia.random<string & tags.Format<"uuid">>();

  const announcement: IRedditPlatformAnnouncement =
    await api.functional.redditPlatform.announcements.at(connection, {
      announcementId,
    });

  typia.assert(announcement);

  TestValidator.equals(
    "announcement ID matches requested ID",
    announcement.id,
    announcementId,
  );
  TestValidator.predicate(
    "announcement has valid title",
    announcement.title.length > 0 && announcement.title.length <= 200,
  );
  TestValidator.predicate(
    "announcement has valid content",
    announcement.content.length > 0 && announcement.content.length <= 10000,
  );
  TestValidator.predicate(
    "announcement has valid type",
    typeof announcement.announcement_type === "string" &&
      announcement.announcement_type.length > 0,
  );
  TestValidator.predicate(
    "announcement has valid target audience",
    typeof announcement.target_audience === "string" &&
      announcement.target_audience.length > 0,
  );
  TestValidator.predicate(
    "announcement has valid priority",
    announcement.priority >= 1 && announcement.priority <= 10,
  );
  TestValidator.predicate(
    "announcement has valid active status",
    typeof announcement.is_active === "boolean",
  );
  TestValidator.predicate(
    "announcement has valid start date",
    typia.is<string & tags.Format<"date-time">>(announcement.start_date),
  );
  TestValidator.predicate(
    "announcement has valid created timestamp",
    typia.is<string & tags.Format<"date-time">>(announcement.created_at),
  );
  TestValidator.predicate(
    "announcement has valid updated timestamp",
    typia.is<string & tags.Format<"date-time">>(announcement.updated_at),
  );
  TestValidator.predicate(
    "end date is optional but valid when present",
    announcement.end_date === null ||
      announcement.end_date === undefined ||
      typia.is<string & tags.Format<"date-time">>(announcement.end_date!),
  );
}
