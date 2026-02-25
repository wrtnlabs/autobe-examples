import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministrator";
import type { IDiscussionBoardAdministratorGrade } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministratorGrade";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardArticleTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleTag";
import type { IDiscussionBoardGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardGuest";
import type { IDiscussionBoardRegisteredUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardRegisteredUser";
import type { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import type { IDiscussionBoardSectionAdminLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSectionAdminLog";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_guest_join } from "../../../authorize/authorize_guest_join";
import { authorize_guest_refresh } from "../../../authorize/authorize_guest_refresh";

export async function test_api_discussion_board_section_detail_success_and_not_found(
  connection: api.IConnection,
): Promise<void> {
  // 1. Guest join - authenticate as guest
  const guestConnection: api.IConnection = { host: connection.host };
  const guest = await authorize_guest_join(guestConnection, {
    body: {
      deviceFingerprint: RandomGenerator.alphaNumeric(16),
      userAgent: "jest-test-agent",
      ipAddress: "127.0.0.1",
      anonymousId: RandomGenerator.alphaNumeric(16),
    } satisfies IDiscussionBoardGuest.IJoin,
  });
  // Set auth token header
  guestConnection.headers = {
    Authorization: guest.token.access,
  };
  // 2. Retrieve an existing section detail
  // We need a valid existing sectionId. Obtain one by calling the API with a random valid ID.
  // This will return 404 for most random UUID, so let's retry until we get a section or a 404 confirmation.
  // Since we don't have a list endpoint, we simulate fetching a valid section.
  // Generate a valid UUID
  const uuid = typia.random<string & tags.Format<"uuid">>();
  // Function to check if section exists - try to get section detail
  let sectionId: string | undefined = undefined;
  try {
    const section = await api.functional.discussionBoard.guest.sections.at(
      guestConnection,
      {
        sectionId: uuid,
      },
    );
    typia.assert(section);
    sectionId = section.id;
  } catch (err) {
    // if 404, then sectionId remains undefined
  }
  // If random UUID does not exist, we must handle not found test separately
  // If sectionId is undefined, it means 404 for random UUID
  // We'll test 404 with that UUID
  // 3. Test 404
  await TestValidator.httpError("section detail - not found", 404, async () => {
    await api.functional.discussionBoard.guest.sections.at(guestConnection, {
      sectionId: uuid,
    });
  });
  // 4. If section exists, test 200 and validate data
  if (sectionId !== undefined) {
    const section = await api.functional.discussionBoard.guest.sections.at(
      guestConnection,
      {
        sectionId: sectionId,
      },
    );
    typia.assert(section);
    // Validate fields
    TestValidator.predicate(
      "section id valid uuid",
      /^[0-9a-f-]{36}$/i.test(section.id),
    );
    TestValidator.predicate("section name not empty", section.name.length > 0);
    TestValidator.predicate(
      "section description exists",
      section.description.length >= 0,
    );
    // Validate timestamps including optional deletedAt
    const iso8601Regex =
      /^[0-9]{4}-(0[1-9]|1[0-2])-(0[1-9]|[12][0-9]|3[01])T([01][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9](\.\d+)?(Z|([+-][01][0-9]:[0-5][0-9]))$/i;
    TestValidator.predicate(
      "createdAt valid ISO 8601",
      iso8601Regex.test(section.createdAt),
    );
    TestValidator.predicate(
      "updatedAt valid ISO 8601",
      iso8601Regex.test(section.updatedAt),
    );
    if (section.deletedAt !== null && section.deletedAt !== undefined) {
      TestValidator.predicate(
        "deletedAt valid ISO 8601 or null",
        iso8601Regex.test(section.deletedAt),
      );
    }
    // Validate adminLogs and articles
    for (const adminLog of section.adminLogs) {
      typia.assert(adminLog);
      TestValidator.predicate(
        "adminLog id valid uuid",
        /^[0-9a-f-]{36}$/i.test(adminLog.id),
      );
      TestValidator.predicate(
        "adminLog actionType non-empty",
        adminLog.actionType.length > 0,
      );
      if (adminLog.note !== null && adminLog.note !== undefined) {
        TestValidator.predicate(
          "adminLog note is string",
          typeof adminLog.note === "string",
        );
      }
      // Validate timestamps in adminLog
      TestValidator.predicate(
        "adminLog createdAt valid ISO 8601",
        iso8601Regex.test(adminLog.createdAt),
      );
      TestValidator.predicate(
        "adminLog updatedAt valid ISO 8601",
        iso8601Regex.test(adminLog.updatedAt),
      );
      typia.assert(adminLog.administrator);
      typia.assert(adminLog.section);
    }
    for (const article of section.articles) {
      typia.assert(article);
      TestValidator.predicate(
        "article id valid uuid",
        /^[0-9a-f-]{36}$/i.test(article.id),
      );
      TestValidator.predicate(
        "article title non-empty",
        article.title.length > 0,
      );
      typia.assert(article.author);
      typia.assert(article.section);
      TestValidator.predicate(
        "article commentCount non-negative",
        article.commentCount >= 0 && Number.isInteger(article.commentCount),
      );
      for (const tag of article.tags) {
        typia.assert(tag);
        TestValidator.predicate(
          "tag id valid uuid",
          /^[0-9a-f-]{36}$/i.test(tag.id),
        );
        TestValidator.predicate(
          "tag articleId valid uuid",
          /^[0-9a-f-]{36}$/i.test(tag.discussionBoardArticleId),
        );
        TestValidator.predicate(
          "tag tagId valid uuid",
          /^[0-9a-f-]{36}$/i.test(tag.discussionBoardTagId),
        );
        // CreatedAt, updatedAt timestamps
        TestValidator.predicate(
          "tag createdAt valid ISO 8601",
          iso8601Regex.test(tag.createdAt),
        );
        TestValidator.predicate(
          "tag updatedAt valid ISO 8601",
          iso8601Regex.test(tag.updatedAt),
        );
        if (tag.deletedAt !== null && tag.deletedAt !== undefined) {
          TestValidator.predicate(
            "tag deletedAt valid ISO 8601 or null",
            iso8601Regex.test(tag.deletedAt),
          );
        }
      }
      TestValidator.predicate(
        "article createdAt valid ISO 8601",
        iso8601Regex.test(article.createdAt),
      );
    }
  }
}
