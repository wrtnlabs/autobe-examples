import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconomicBoardArticleSnapshotTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicBoardArticleSnapshotTag";
import type { IEconomicBoardCitizen } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicBoardCitizen";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEconomicBoardArticleSnapshotTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEconomicBoardArticleSnapshotTag";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_citizen_join } from "../../../authorize/authorize_citizen_join";
import { authorize_citizen_login } from "../../../authorize/authorize_citizen_login";
import { authorize_citizen_refresh } from "../../../authorize/authorize_citizen_refresh";

export async function test_api_article_snapshot_tags_filtered_by_exact_match(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create citizen user to obtain an authenticated connection
  const citizenConnection: api.IConnection = { host: connection.host };
  const citizen: IEconomicBoardCitizen.IAuthorized =
    await authorize_citizen_join(citizenConnection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        display_name: RandomGenerator.name(),
        bio: RandomGenerator.paragraph({ sentences: 1 }),
      } satisfies IEconomicBoardCitizen.IJoin,
    });
  typia.assert(citizen);
  // 2. Generate a valid snapshot ID (UUID) for testing tag filtering
  // This simulates an existing article snapshot with tags
  const snapshotId = typia.random<string & tags.Format<"uuid">>();
  // 3. Test exact tag filtering with two known tag values
  const response =
    await api.functional.economicBoard.article_snapshots.tags.index(
      citizenConnection,
      {
        snapshotId,
        body: {
          tag: ["economy", "democracy"],
        } satisfies IEconomicBoardArticleSnapshotTag.IRequest,
      },
    );
  typia.assert(response);
  // 4. Verify the response structure
  TestValidator.equals(
    "pagination total records",
    response.pagination.records,
    response.data.length,
  );
  TestValidator.equals(
    "pagination current page",
    response.pagination.current,
    1,
  );
  TestValidator.equals("pagination limit", response.pagination.limit, 50); // default limit
  // 5. Validate that only exactly matching tags are returned (case-sensitive, no partial matches)
  const returnedTags = response.data.map((item) => item.tag);
  TestValidator.equals("number of returned tags", returnedTags.length, 2);
  TestValidator.predicate(
    "contains exact tag 'economy'",
    returnedTags.includes("economy"),
  );
  TestValidator.predicate(
    "contains exact tag 'democracy'",
    returnedTags.includes("democracy"),
  );
  TestValidator.predicate(
    "does NOT contain uppercase variation 'Economy'",
    !returnedTags.includes("Economy"),
  );
  TestValidator.predicate(
    "does NOT contain partial match 'economic'",
    !returnedTags.includes("economic"),
  );
  TestValidator.predicate(
    "does NOT contain unrelated tag 'taxation'",
    !returnedTags.includes("taxation"),
  );
  // 6. Verify tag objects have correct structure
  response.data.forEach((tag) => {
    TestValidator.equals("tag is string", typeof tag.tag, "string");
    TestValidator.predicate(
      "tag length is between 1 and 50",
      tag.tag.length >= 1 && tag.tag.length <= 50,
    );
    TestValidator.equals(
      "created_at is ISO format",
      typeof tag.created_at,
      "string",
    );
    TestValidator.predicate(
      "created_at valid ISO date time",
      !isNaN(Date.parse(tag.created_at)),
    );
  });
}
