import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardArticleImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleImage";
import type { IDiscussionBoardGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardGuest";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardArticleImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardArticleImage";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_guest_join } from "../../../authorize/authorize_guest_join";
import { authorize_guest_refresh } from "../../../authorize/authorize_guest_refresh";

export async function test_api_discussionboard_guest_article_image_retrieval(
  connection: api.IConnection,
): Promise<void> {
  // Create guest session
  const guestConnection: api.IConnection = { host: connection.host };
  const guestSession = await authorize_guest_join(guestConnection, {
    body: typia.random<IDiscussionBoardGuest.IJoin>(),
  });
  typia.assert(guestSession);
  // Test: Retrieve images for a valid article using a generated UUID
  // Note: This assumes there's test data available or the endpoint handles empty results gracefully
  const testArticleId = typia.random<string & tags.Format<"uuid">>();
  const response =
    await api.functional.discussionBoard.guest.articles.images.index(
      guestConnection,
      {
        articleId: testArticleId,
      },
    );
  typia.assert(response);
  // Validate pagination structure (response.data could be empty if article has no images)
  TestValidator.predicate("pagination structure valid", () => {
    const p = response.pagination;
    return p.current > 0 && p.limit > 0 && p.records >= 0 && p.pages >= 0;
  });
  // Validate data array structure
  TestValidator.equals("data is array", Array.isArray(response.data), true);
  // If images exist, validate their structure
  if (response.data.length > 0) {
    for (const image of response.data) {
      typia.assert(image);
    }
  }
}
