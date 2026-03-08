import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMember";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace RedditPlatformMemberCollector {
  export async function collect(props: {
    body: IRedditPlatformMember.ICreate;
  }) {
    const id: string = v4();
    return {
      id,
      email: props.body.email,
      password_hash: await PasswordUtil.hash(props.body.password),
      username: props.body.username,
      display_name: props.body.displayName ?? props.body.username,
      bio: props.body.bio ?? null,
      avatar_url: "",
      karma_score: 0,
      is_active: true,
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
      sessions: undefined,
      passwordResetTokens: undefined,
      emailVerifications: undefined,
      ownedCommunities: undefined,
      posts: undefined,
      memberPostVotes: undefined,
      postSnapshots: undefined,
      comments: undefined,
      commentVotes: undefined,
      reports: undefined,
      resolvedReports: undefined,
      subscriptions: undefined,
      moderatorOfCommunities: undefined,
      moderationAuditLogs: undefined,
      userModerationAuditLogs: undefined,
      moderatorHistoryRecords: undefined,
      moderatorHistoryActions: undefined,
      bannedUsers: undefined,
      issuedBans: undefined,
    } satisfies Prisma.reddit_platform_membersCreateInput;
  }
}
