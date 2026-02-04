import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { ICommunityPlatformReport } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReport";
import { prepare_random_community_platform_report } from "../prepare/prepare_random_community_platform_report";
export async function generate_random_community_platform_member_posts_comments_reports_report(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<ICommunityPlatformReport.ICreate> | undefined;
    params: {
      postId: string;
      commentId: string;
    };
  },
): Promise<ICommunityPlatformReport> {
  const prepared: ICommunityPlatformReport.ICreate =
    prepare_random_community_platform_report(props.body);
  return await api.functional.communityPlatform.member.posts.comments.reports.report(
    connection,
    {
      body: prepared,
      postId: props.params.postId,
      commentId: props.params.commentId,
    },
  );
}
