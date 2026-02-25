import { ICommunityPlatformCommunityAnnouncement } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityAnnouncement";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

export function prepare_random_community_platform_community_announcement(
  input?: DeepPartial<ICommunityPlatformCommunityAnnouncement.ICreate>,
): ICommunityPlatformCommunityAnnouncement.ICreate {
  return {
    title: input?.title ?? RandomGenerator.paragraph({ sentences: 3 }),
    content: input?.content ?? RandomGenerator.content({ paragraphs: 2 }),
    is_pinned: input?.is_pinned ?? false,
    status: input?.status ?? "active",
  };
}
