import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformGuest";
import type { ICommunityPlatformPostLink } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostLink";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_guest_join } from "../../../authorize/authorize_guest_join";
import { authorize_guest_refresh } from "../../../authorize/authorize_guest_refresh";

export async function test_api_guest_post_link_not_found_when_deleted_or_missing_metadata(
  connection: api.IConnection,
): Promise<void> {
  const guestConnection: api.IConnection = { host: connection.host };
  const guest = await authorize_guest_join(guestConnection, {
    body: {
      device_fingerprint: RandomGenerator.alphabets(32),
      ip: typia.random<string & tags.Format<"ipv4">>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies ICommunityPlatformGuest.IJoin,
  });
  typia.assert(guest);
  const deletedPostId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.httpError(
    "deleted post should be not found",
    [400, 404],
    async () => {
      await api.functional.communityPlatform.guest.posts.link.at(
        guestConnection,
        {
          postId: deletedPostId,
        },
      );
    },
  );
  const missingLinkMetadataPostId = typia.random<
    string & tags.Format<"uuid">
  >();
  await TestValidator.httpError(
    "missing link metadata should be not found",
    [400, 404],
    async () => {
      await api.functional.communityPlatform.guest.posts.link.at(
        guestConnection,
        {
          postId: missingLinkMetadataPostId,
        },
      );
    },
  );
}
