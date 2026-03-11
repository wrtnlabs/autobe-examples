import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardArticleTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleTag";
import type { IDiscussionBoardGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardGuest";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardArticle";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_guest_join } from "../../../authorize/authorize_guest_join";
import { authorize_guest_refresh } from "../../../authorize/authorize_guest_refresh";

export async function test_api_guest_discovery_section_filtering(
  connection: api.IConnection,
): Promise<void> {
  // Create guest connection using utility function
  const guestConnection: api.IConnection = { host: connection.host };
  await authorize_guest_join(guestConnection, {
    body: {
      device_fingerprint: RandomGenerator.alphaNumeric(32),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IDiscussionBoardGuest.IJoin,
  });
  // Test discovery with section filtering - use empty request to get all sections first
  const allSectionsResult =
    await api.functional.discussionBoard.guest.discovery.index(
      guestConnection,
      {
        body: {
          limit: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<100>
          >(),
        } satisfies IDiscussionBoardArticle.IRequest,
      },
    );
  typia.assert(allSectionsResult);
  // If we have articles with sections, test section filtering
  if (allSectionsResult.data.length > 0) {
    // Get a valid section ID from the first article
    const validSectionId = allSectionsResult.data[0].section.id;
    // Test filtering by valid section
    const sectionFilterResult =
      await api.functional.discussionBoard.guest.discovery.index(
        guestConnection,
        {
          body: {
            discussion_board_section_id: validSectionId,
          } satisfies IDiscussionBoardArticle.IRequest,
        },
      );
    typia.assert(sectionFilterResult);
    // Validate that all returned articles belong to the filtered section
    for (const article of sectionFilterResult.data) {
      TestValidator.equals(
        "article belongs to filtered section",
        article.section.id,
        validSectionId,
      );
    }
  }
  // Test with non-existent section ID
  const nonExistentSectionResult =
    await api.functional.discussionBoard.guest.discovery.index(
      guestConnection,
      {
        body: {
          discussion_board_section_id: typia.random<
            string & tags.Format<"uuid">
          >(),
        } satisfies IDiscussionBoardArticle.IRequest,
      },
    );
  typia.assert(nonExistentSectionResult);
  // Empty result set expected for non-existent section
  TestValidator.equals(
    "non-existent section returns empty data",
    nonExistentSectionResult.data.length,
    0,
  );
  // Test combination of section filtering and search (if we have valid sections)
  if (allSectionsResult.data.length > 0) {
    const validSectionId = allSectionsResult.data[0].section.id;
    const combinedFilterResult =
      await api.functional.discussionBoard.guest.discovery.index(
        guestConnection,
        {
          body: {
            discussion_board_section_id: validSectionId,
            search:
              RandomGenerator.substring(allSectionsResult.data[0].title) ||
              "test",
          } satisfies IDiscussionBoardArticle.IRequest,
        },
      );
    typia.assert(combinedFilterResult);
    // Validate articles belong to the correct section
    for (const article of combinedFilterResult.data) {
      TestValidator.equals(
        "article belongs to filtered section in combined search",
        article.section.id,
        validSectionId,
      );
    }
  }
}
