import { IPage } from "./IPage";
import { ITodoAppConfigurationSnapshot } from "./ITodoAppConfigurationSnapshot";

export namespace IPageITodoAppConfigurationSnapshot {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: ITodoAppConfigurationSnapshot.ISummary[];
  };
}
