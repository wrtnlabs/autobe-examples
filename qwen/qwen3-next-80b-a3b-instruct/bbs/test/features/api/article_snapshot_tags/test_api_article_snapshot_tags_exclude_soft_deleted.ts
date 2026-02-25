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

export async function test_api_article_snapshot_tags_exclude_soft_deleted(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create citizen user for authentication
  const citizenConnection: api.IConnection = { host: connection.host };
  const citizen = await authorize_citizen_join(citizenConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    },
  });
  typia.assert(citizen);
  // 2. Use the citizen's authenticated connection to call the snapshot tag endpoint
  // We assume a snapshot exists with 3 tags, and one has been soft-deleted
  // The client only knows the snapshotId — we generate a valid UUID
  const snapshotId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  // 3. Retrieve the tags associated with this snapshot
  const snapshotTagsResponse =
    await api.functional.economicBoard.article_snapshots.tags.index(
      citizenConnection,
      {
        snapshotId,
        body: {},
      },
    );
  typia.assert(snapshotTagsResponse);
  // 4. Validate that only 2 tags are returned (one was soft-deleted)
  TestValidator.equals(
    "correct number of tags in snapshot",
    snapshotTagsResponse.data.length,
    2,
  );
  // 5. Verify that the returned tags are not the deleted one
  // Assume deleted tag was "technology" — based on scenario description
  const returnedTags = snapshotTagsResponse.data.map((tag) => tag.tag);
  TestValidator.predicate(
    "deleted tag not in snapshot",
    () => !returnedTags.includes("technology"),
  );
  // 6. Validate that the two returned tags are among the expected non-deleted tags
  const expectedNonDeletedTags = ["economics", "politics"];
  const isCorrectTags =
    returnedTags.every((tag) => expectedNonDeletedTags.includes(tag)) &&
    expectedNonDeletedTags.every((tag) => returnedTags.includes(tag));
  TestValidator.predicate(
    "correct non-deleted tags returned",
    () => isCorrectTags,
  );
  // 7. Validate that all returned tags have valid format
  snapshotTagsResponse.data.forEach((tag) => {
    TestValidator.predicate(
      "tag is string with length 1-50",
      () =>
        typeof tag.tag === "string" &&
        tag.tag.length >= 1 &&
        tag.tag.length <= 50,
    );
    TestValidator.predicate(
      "created_at is ISO datetime",
      () => !!tag.created_at && !isNaN(Date.parse(tag.created_at)),
    );
  });
}
