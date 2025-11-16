import { IPage } from "./IPage";
import { IEconomicDiscussionArticleVersion } from "./IEconomicDiscussionArticleVersion";

export namespace IPageIEconomicDiscussionArticleVersion {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: IEconomicDiscussionArticleVersion.ISummary[];
  };
}
