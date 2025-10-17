import { tags } from "typia";

export namespace IRedditLikeUser {
  /**
   * User karma scores.
   *
   * Current reputation metrics from voting activity.
   */
  export type IKarma = {
    /** Post karma score. */
    post_karma: number & tags.Type<"int32">;

    /** Comment karma score. */
    comment_karma: number & tags.Type<"int32">;

    /** Total karma (post + comment). */
    total_karma: number & tags.Type<"int32">;
  };

  /** Karma history search parameters. */
  export type IKarmaHistoryRequest = {
    /** Page number. */
    page?: (number & tags.Type<"int32"> & tags.Minimum<1>) | undefined;

    /** Records per page. */
    limit?:
      | (number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<100>)
      | undefined;

    /** Filter by type: 'post' or 'comment'. */
    karma_type?: string | undefined;
  };

  /**
   * User profile view.
   *
   * Public profile information respecting privacy settings.
   */
  export type IProfile = {
    /** User identifier. */
    id: string & tags.Format<"uuid">;

    /** Username. */
    username: string;

    /** Biography. */
    profile_bio?: string | undefined;

    /** Avatar URL. */
    avatar_url?: string | undefined;

    /** Post karma. */
    post_karma: number & tags.Type<"int32">;

    /** Comment karma. */
    comment_karma: number & tags.Type<"int32">;

    /** Account age. */
    created_at: string & tags.Format<"date-time">;
  };

  /**
   * Profile update request.
   *
   * Editable profile fields only.
   */
  export type IProfileUpdate = {
    /** Updated biography. */
    profile_bio?: (string & tags.MaxLength<500>) | undefined;

    /** Updated avatar URL. */
    avatar_url?: string | undefined;
  };

  /** User posts search parameters. */
  export type IPostsRequest = {
    /** Page number. */
    page?: (number & tags.Type<"int32"> & tags.Minimum<1>) | undefined;

    /** Records per page. */
    limit?:
      | (number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<100>)
      | undefined;

    /** Sort: 'new', 'top', 'controversial'. */
    sort_by?: string | undefined;
  };

  /** User comments search parameters. */
  export type ICommentsRequest = {
    /** Page number. */
    page?: (number & tags.Type<"int32"> & tags.Minimum<1>) | undefined;

    /** Records per page. */
    limit?:
      | (number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<100>)
      | undefined;

    /** Sort: 'new', 'top', 'controversial'. */
    sort_by?: string | undefined;
  };

  /** User subscriptions search parameters. */
  export type ISubscriptionsRequest = {
    /** Page number. */
    page?: (number & tags.Type<"int32"> & tags.Minimum<1>) | undefined;

    /** Records per page. */
    limit?:
      | (number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<100>)
      | undefined;
  };

  /** Subscription creation request. */
  export type ISubscriptionCreate = {
    /** Community to subscribe to. */
    community_id: string & tags.Format<"uuid">;
  };

  /**
   * User privacy settings.
   *
   * Controls visibility of profile elements.
   */
  export type IPrivacySettings = {
    /** Profile visibility level. */
    profile_privacy: string;

    /** Karma visibility. */
    show_karma_publicly: boolean;

    /** Subscription list visibility. */
    show_subscriptions_publicly: boolean;
  };

  /**
   * Privacy settings update.
   *
   * All fields optional for partial updates.
   */
  export type IUpdatePrivacy = {
    /** Updated profile privacy. */
    profile_privacy?: string | undefined;

    /** Updated karma visibility. */
    show_karma_publicly?: boolean | undefined;

    /** Updated subscription visibility. */
    show_subscriptions_publicly?: boolean | undefined;
  };
}
