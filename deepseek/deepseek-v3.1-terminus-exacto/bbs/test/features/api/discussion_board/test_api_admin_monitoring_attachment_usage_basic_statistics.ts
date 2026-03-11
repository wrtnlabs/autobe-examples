import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardArticleTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleTag";
import type { IDiscussionBoardAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAttachment";
import type { IDiscussionBoardAttachmentDownload } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAttachmentDownload";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_admin_monitoring_attachment_usage_basic_statistics(
  connection: api.IConnection,
): Promise<void> {
  // Create admin connection and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IDiscussionBoardAdmin.IJoin,
  });
  // Call the attachment usage monitoring endpoint
  const statistics =
    await api.functional.discussionBoard.admin.monitoring.attachment_usage.at(
      adminConnection,
    );
  typia.assert(statistics);
  // Validate that the response contains attachment download analytics
  TestValidator.predicate(
    "statistics contains valid download record",
    statistics.id !== undefined,
  );
  TestValidator.predicate(
    "statistics contains valid attachment data",
    statistics.attachment !== undefined,
  );
  // Validate that numeric values are non-negative
  TestValidator.predicate(
    "attachment size_bytes non-negative",
    statistics.attachment.size_bytes >= 0,
  );
  // Validate that the response reflects actual platform usage patterns
  TestValidator.predicate(
    "actor_type is valid",
    ["guest", "member", "admin", "super_admin"].includes(statistics.actor_type),
  );
  TestValidator.predicate(
    "IP format is valid",
    /^(?:[0-9]{1,3}\.){3}[0-9]{1,3}$/.test(statistics.ip),
  );
}
